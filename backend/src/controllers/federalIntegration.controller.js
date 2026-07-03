import Club from '../models/Club.js';
import User from '../models/User.js';
import Athlete from '../models/Athlete.js';
import UploadAsset from '../models/UploadAsset.js';
import ImportBatch from '../models/ImportBatch.js';
import AssociationTransfer from '../models/AssociationTransfer.js';
import { makeFederalId } from '../utils/federalId.js';
import { randomToken } from '../utils/crypto.js';
import { sendMail } from '../services/mail.service.js';
import { audit } from '../utils/audit.js';
import { importClubAthletes as importAthletesService } from '../services/import.service.js';

function notFound(res, entity) {
  return res.status(404).json({ message: `${entity} introuvable` });
}

/**
 * Approve a club's affiliation and create portal access credentials.
 *
 * Steps:
 *  1. Fetch the club record by ID
 *  2. Verify all UploadAsset documents linked to this club are approved
 *  3. Issue a federal ID, mark affiliation as APPROVED / VALIDATED
 *  4. Create (or reactivate) a CLUB_ADMIN User profile linked to the club
 *  5. Generate a secure temporary password and send it via email
 *  6. Log the action in the audit trail
 */
export async function approveAffiliationAndCreateAccess(req, res) {
  try {
    const clubId = req.params.id;

    // 1. Fetch club and verify it exists
    const club = await Club.findById(clubId);
    if (!club) return notFound(res, 'Club');

    // 2. Scan UploadAsset collection for files linked to this club
    const assets = await UploadAsset.find({
      ownerType: 'Club',
      owner: club._id
    }).lean();

    const nonApprovedAssets = assets.filter(a => a.status !== 'approved');
    if (nonApprovedAssets.length > 0) {
      return res.status(400).json({
        message: 'Tous les documents du club doivent etre approuves avant validation de l\'affiliation.',
        pendingDocuments: nonApprovedAssets.map(a => ({
          id: a._id,
          title: a.title,
          status: a.status
        }))
      });
    }

    // 3. Issue federal ID and update club status
    const federalId = await makeFederalId('CLUB');

    club.federalId = federalId;
    club.affiliationStatus = 'APPROVED';
    club.affiliationDocumentsStatus = 'VALIDATED';
    club.affiliationValidatedBy = req.user._id;
    club.affiliationValidatedAt = new Date();

    await club.save();

    // 4. Create or reactivate CLUB_ADMIN user profile
    if (!club.email) {
      return res.status(400).json({ message: 'Le club doit avoir une adresse email pour creer l\'acces au portail.' });
    }

    let user = await User.findOne({ email: club.email });

    if (user) {
      // Reactivate / reassign the existing user
      user.role = 'CLUB_ADMIN';
      user.club = club._id;
      user.isActive = true;
    } else {
      user = new User({
        firstName: club.president || 'Admin',
        lastName: club.name || '',
        email: club.email,
        password: randomToken(), // temporary — will be overridden
        role: 'CLUB_ADMIN',
        club: club._id,
        isActive: true,
        emailVerified: false
      });
    }

    // 5. Generate secure temporary password
    const tempPassword = randomToken().slice(0, 16);
    user.password = tempPassword;

    await user.save();

    // Record portal access timestamps
    club.portalAccessCreatedAt = club.portalAccessCreatedAt || new Date();
    club.portalAccessSentAt = new Date();
    await club.save();

    // Send temporary password via email
    const mailHtml = `
      <h2>Félicitations — Affiliation approuvée</h2>
      <p>Bonjour,</p>
      <p>L'affiliation de votre club <strong>${club.name}</strong> a été validée par la Fédération Tunisienne de Jiu-Jitsu Brésilien.</p>
      <p>Votre identifiant fédéral est : <strong>${federalId}</strong></p>
      <p>Vous pouvez accéder au portail avec les identifiants suivants :</p>
      <ul>
        <li><strong>Email :</strong> ${club.email}</li>
        <li><strong>Mot de passe temporaire :</strong> ${tempPassword}</li>
      </ul>
      <p>Veuillez vous connecter et changer votre mot de passe dès votre première connexion.</p>
      <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login">Accéder au portail FTJJ</a></p>
    `;

    await sendMail({
      to: club.email,
      subject: `[FTJJ] Affiliation approuvée — ${club.name}`,
      html: mailHtml
    });

    // 6. Audit trail
    await audit({
      actor: req.user._id,
      action: 'CLUB_AFFILIATION_APPROVED',
      entity: 'Club',
      entityId: club._id,
      metadata: {
        federalId,
        clubName: club.name,
        clubEmail: club.email,
        userId: user._id,
        portalAccessSent: true
      }
    });

    return res.json({
      message: 'Affiliation approuvée avec succès.',
      club: {
        _id: club._id,
        name: club.name,
        federalId: club.federalId,
        affiliationStatus: club.affiliationStatus,
        affiliationDocumentsStatus: club.affiliationDocumentsStatus
      },
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[approveAffiliationAndCreateAccess]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'approbation de l\'affiliation.' });
  }
}

/**
 * Import athletes from an uploaded XLSX or CSV file for a specific club.
 *
 * Access: CLUB_ADMIN (own club) or FEDERATION_ADMIN (any club).
 * Expects multipart/form-data with a 'file' field and optional 'clubId' body field.
 */
export async function importClubAthletes(req, res) {
  try {
    // Determine target club
    let clubId;
    if (req.user.role === 'FEDERATION_ADMIN' || req.user.role === 'SUPER_ADMIN') {
      clubId = req.body.clubId || req.user.club;
    } else if (req.user.role === 'CLUB_ADMIN') {
      clubId = req.user.club;
    } else {
      return res.status(403).json({ message: 'Role non autorise pour l\'import d\'athletes.' });
    }

    if (!clubId) {
      return res.status(400).json({ message: 'Identifiant du club requis.' });
    }

    // Verify club exists
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club introuvable.' });

    // Ensure a file was uploaded
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Fichier requis. Envoyez un fichier XLSX ou CSV.' });
    }

    // Run the import service
    const batch = await importAthletesService({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      clubId,
      federationId: req.user.federation || club.federation,
      importedBy: req.user._id
    });

    return res.status(200).json({
      message: 'Import termine.',
      batch: {
        _id: batch._id,
        status: batch.status,
        totalRows: batch.totalRows,
        inserted: batch.inserted,
        updated: batch.updated,
        rejected: batch.rejected,
        errors: batch.rowErrors,
        sourceFile: batch.sourceFile,
        createdAt: batch.createdAt
      }
    });

  } catch (error) {
    console.error('[importClubAthletes]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'import d\'athletes.' });
  }
}

/**
 * Get import batch history for a club.
 */
export async function getImportBatches(req, res) {
  try {
    let clubId;
    if (req.user.role === 'FEDERATION_ADMIN' || req.user.role === 'SUPER_ADMIN') {
      clubId = req.query.clubId || req.params.clubId;
    } else {
      clubId = req.user.club;
    }

    const filter = {};
    if (clubId) filter.club = clubId;

    const batches = await ImportBatch.find(filter)
      .populate('importedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json(batches);
  } catch (error) {
    console.error('[getImportBatches]', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

/**
 * Federation admin manual correction of athlete data.
 *
 * Permitted keys whitelist prevents arbitrary field injection.
 * If validationStatus is set to 'VALIDATED', the admin's ID
 * and current timestamp are recorded.
 *
 * Route: PATCH /api/federal-integration/athletes/:athleteId/correct
 */
const PERMITTED_CORRECTION_KEYS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'age',
  'category',
  'weight',
  'belt',
  'specialty',
  'achievements',
  'licenseStatus',
  'validationStatus'
];

export async function federationCorrectAthlete(req, res) {
  try {
    const { athleteId } = req.params;
    const { reason, ...fields } = req.body;

    // 1. Authorize — only FEDERATION_ADMIN (enforced at route level, double-check here)
    if (!req.user || req.user.role !== 'FEDERATION_ADMIN') {
      return res.status(403).json({ message: 'Seul un administrateur federal peut effectuer cette correction.' });
    }

    // 2. Require mandatory reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        message: 'Un motif de correction (reason) est obligatoire.',
        detail: 'Veuillez fournir une justification texte pour cette correction administrative.'
      });
    }

    // 3. Fetch the athlete
    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      return res.status(404).json({ message: 'Athlete introuvable.' });
    }

    // 4. Filter input against permitted keys
    const updates = {};
    const rejectedKeys = [];

    for (const [key, value] of Object.entries(fields)) {
      if (PERMITTED_CORRECTION_KEYS.includes(key)) {
        // Type coercion for known numeric fields
        if (key === 'age' || key === 'weight') {
          const num = Number(value);
          if (value != null && !isNaN(num)) {
            updates[key] = num;
          }
        } else {
          updates[key] = value;
        }
      } else {
        rejectedKeys.push(key);
      }
    }

    // 5. If no valid fields, reject
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'Aucun champ valide fourni pour la correction.',
        rejectedKeys,
        permittedKeys: PERMITTED_CORRECTION_KEYS
      });
    }

    // 6. If validationStatus is being set to VALIDATED, record admin + timestamp
    if (updates.validationStatus === 'VALIDATED') {
      updates.validatedAt = new Date();
      updates.validatedBy = req.user._id;
    }

    // 7. Always record the correction reason
    updates.lastCorrectionReason = reason.trim();

    // 8. Build a snapshot of what changed for the audit log
    const changedFields = Object.keys(updates);
    const beforeValues = {};
    for (const key of changedFields) {
      if (key !== 'lastCorrectionReason' && key !== 'validatedAt' && key !== 'validatedBy') {
        beforeValues[key] = athlete[key];
      }
    }

    // 9. Apply updates
    Object.assign(athlete, updates);
    await athlete.save();

    // 10. Audit trail
    await audit({
      actor: req.user._id,
      action: 'FEDERATION_ATHLETE_CORRECTION',
      entity: 'Athlete',
      entityId: athlete._id,
      metadata: {
        reason: reason.trim(),
        changedFields,
        beforeValues,
        rejectedKeys,
        newValidationStatus: updates.validationStatus || athlete.validationStatus
      }
    });

    return res.json({
      message: 'Correction appliquee avec succes.',
      athlete: {
        _id: athlete._id,
        federalId: athlete.federalId,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        validationStatus: athlete.validationStatus,
        lastCorrectionReason: athlete.lastCorrectionReason,
        validatedAt: athlete.validatedAt
      },
      appliedFields: changedFields,
      rejectedKeys: rejectedKeys.length > 0 ? rejectedKeys : undefined
    });

  } catch (error) {
    console.error('[federationCorrectAthlete]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la correction athlete.' });
  }
}

/**
 * Submit a new association transfer request.
 *
 * Access: CLUB_ADMIN (requesting transfer for their own athletes)
 *         or FEDERATION_ADMIN (initiate on behalf of any club).
 */
export async function requestAssociationTransfer(req, res) {
  try {
    const { athleteId, toClubId, reason } = req.body;

    // Validate required fields
    if (!athleteId || !toClubId || !reason) {
      return res.status(400).json({
        message: 'Champs obligatoires manquants.',
        required: ['athleteId', 'toClubId', 'reason']
      });
    }

    // Fetch athlete
    const athlete = await Athlete.findById(athleteId);
    if (!athlete) return res.status(404).json({ message: 'Athlete introuvable.' });

    // Determine the source club
    const fromClubId = athlete.club;
    if (!fromClubId) {
      return res.status(400).json({ message: 'L\'athlete n\'est actuellement rattache a aucun club.' });
    }

    // Prevent transfer to the same club
    if (String(fromClubId) === String(toClubId)) {
      return res.status(400).json({ message: 'L\'athlete est deja membre de ce club.' });
    }

    // Verify target club exists
    const toClub = await Club.findById(toClubId);
    if (!toClub) return res.status(404).json({ message: 'Club de destination introuvable.' });

    // Verify source club exists
    const fromClub = await Club.findById(fromClubId);
    if (!fromClub) return res.status(404).json({ message: 'Club d\'origine introuvable.' });

    // Check for existing pending transfer
    const existing = await AssociationTransfer.findOne({
      athlete: athleteId,
      status: 'PENDING'
    });
    if (existing) {
      return res.status(409).json({
        message: 'Une demande de transfert est deja en attente pour cet athlete.',
        existingTransferId: existing._id
      });
    }

    // Create the transfer request
    const transfer = await AssociationTransfer.create({
      federation: athlete.federation || fromClub.federation,
      athlete: athleteId,
      fromClub: fromClubId,
      toClub: toClubId,
      reason: reason.trim(),
      requestedBy: req.user._id,
      status: 'PENDING'
    });

    // Audit
    await audit({
      actor: req.user._id,
      action: 'ASSOCIATION_TRANSFER_REQUESTED',
      entity: 'AssociationTransfer',
      entityId: transfer._id,
      metadata: {
        athlete: athleteId,
        fromClub: fromClubId,
        toClub: toClubId,
        reason: reason.trim()
      }
    });

    return res.status(201).json({
      message: 'Demande de transfert creee avec succes.',
      transfer: await transfer.populate([
        { path: 'athlete', select: 'firstName lastName federalId' },
        { path: 'fromClub', select: 'name federalId' },
        { path: 'toClub', select: 'name federalId' },
        { path: 'requestedBy', select: 'firstName lastName email' }
      ])
    });

  } catch (error) {
    console.error('[requestAssociationTransfer]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la demande de transfert.' });
  }
}

/**
 * Evaluate (approve or reject) an association transfer request.
 *
 * Access: FEDERATION_ADMIN only.
 *
 * On APPROVAL:
 *  - Push a history entry closing the old club association (toDate: now)
 *  - Update athlete.club and athlete.currentAssociation to toClub
 *  - Push a history entry opening the new club membership (fromDate: now)
 *  - Update transfer status
 *
 * On REJECTION:
 *  - Store rejection reason
 *  - Keep athlete's current club bounds unchanged
 */
export async function decideAssociationTransfer(req, res) {
  try {
    const { transferId } = req.params;
    const { decision, rejectionReason } = req.body;

    // Validate decision
    if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        message: 'Decision invalide.',
        allowedValues: ['APPROVED', 'REJECTED']
      });
    }

    // Fetch the transfer
    const transfer = await AssociationTransfer.findById(transferId);
    if (!transfer) return res.status(404).json({ message: 'Demande de transfert introuvable.' });

    // Must be PENDING
    if (transfer.status !== 'PENDING') {
      return res.status(409).json({
        message: `Cette demande de transfert a deja ete traitee (statut actuel: ${transfer.status}).`,
        currentStatus: transfer.status
      });
    }

    const now = new Date();

    if (decision === 'REJECTED') {
      // --- REJECTION PATH ---
      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
        return res.status(400).json({
          message: 'Un motif de rejet (rejectionReason) est obligatoire.'
        });
      }

      transfer.status = 'REJECTED';
      transfer.rejectionReason = rejectionReason.trim();
      transfer.decidedBy = req.user._id;
      transfer.decidedAt = now;
      await transfer.save();

      await audit({
        actor: req.user._id,
        action: 'ASSOCIATION_TRANSFER_REJECTED',
        entity: 'AssociationTransfer',
        entityId: transfer._id,
        metadata: {
          athlete: transfer.athlete,
          fromClub: transfer.fromClub,
          toClub: transfer.toClub,
          rejectionReason: rejectionReason.trim()
        }
      });

      return res.json({
        message: 'Demande de transfert rejetee.',
        transfer: await transfer.populate([
          { path: 'athlete', select: 'firstName lastName federalId' },
          { path: 'decidedBy', select: 'firstName lastName email' }
        ])
      });
    }

    // --- APPROVAL PATH ---
    const athlete = await Athlete.findById(transfer.athlete);
    if (!athlete) {
      return res.status(404).json({ message: 'Athlete introuvable (le profil a peut-etre ete supprime).' });
    }

    const oldClubId = athlete.club;

    // 1. Close the old club association — push history entry
    const closeEntry = {
      clubId: oldClubId,
      fromDate: athlete.createdAt || undefined,
      toDate: now,
      reason: `Transfert vers un autre club — ${transfer.reason}`,
      modifiedBy: req.user._id
    };

    // Update any existing open-ended entry for the old club
    const existingOldEntry = athlete.associationHistory.find(
      e => String(e.clubId) === String(oldClubId) && !e.toDate
    );
    if (existingOldEntry) {
      existingOldEntry.toDate = now;
      if (!existingOldEntry.reason) {
        existingOldEntry.reason = closeEntry.reason;
      }
    } else {
      athlete.associationHistory.push(closeEntry);
    }

    // 2. Transition club membership
    athlete.club = transfer.toClub;
    athlete.currentAssociation = transfer.toClub;

    // 3. Open the new club association — push history entry
    const openEntry = {
      clubId: transfer.toClub,
      fromDate: now,
      toDate: undefined,
      reason: `Arrivee par transfert depuis un autre club — ${transfer.reason}`,
      modifiedBy: req.user._id
    };
    athlete.associationHistory.push(openEntry);

    await athlete.save();

    // 4. Update transfer record
    transfer.status = 'APPROVED';
    transfer.decidedBy = req.user._id;
    transfer.decidedAt = now;
    await transfer.save();

    // 5. Audit
    await audit({
      actor: req.user._id,
      action: 'ASSOCIATION_TRANSFER_APPROVED',
      entity: 'AssociationTransfer',
      entityId: transfer._id,
      metadata: {
        athlete: transfer.athlete,
        previousClub: oldClubId,
        newClub: transfer.toClub,
        reason: transfer.reason
      }
    });

    return res.json({
      message: 'Transfert approuve avec succes.',
      transfer: await transfer.populate([
        { path: 'athlete', select: 'firstName lastName federalId club currentAssociation' },
        { path: 'fromClub', select: 'name federalId' },
        { path: 'toClub', select: 'name federalId' },
        { path: 'decidedBy', select: 'firstName lastName email' }
      ]),
      athlete: {
        _id: athlete._id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        federalId: athlete.federalId,
        club: athlete.club,
        currentAssociation: athlete.currentAssociation,
        associationHistory: athlete.associationHistory
      }
    });

  } catch (error) {
    console.error('[decideAssociationTransfer]', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la decision de transfert.' });
  }
}

/**
 * List all association transfers.
 *
 * Access: FEDERATION_ADMIN / SUPER_ADMIN (all transfers)
 *         CLUB_ADMIN (transfers involving their club)
 */
export async function listTransfers(req, res) {
  try {
    const filter = {};

    // CLUB_ADMIN can only see transfers involving their club
    if (req.user.role === 'CLUB_ADMIN' && req.user.club) {
      filter.$or = [
        { fromClub: req.user.club },
        { toClub: req.user.club }
      ];
    }

    // Optional status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const transfers = await AssociationTransfer.find(filter)
      .populate('athlete', 'firstName lastName federalId')
      .populate('fromClub', 'name federalId')
      .populate('toClub', 'name federalId')
      .populate('requestedBy', 'firstName lastName email')
      .populate('decidedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json(transfers);
  } catch (error) {
    console.error('[listTransfers]', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}
