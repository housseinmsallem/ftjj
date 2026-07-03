import UploadAsset from '../models/UploadAsset.js';
import License from '../models/License.js';

/**
 * Express middleware: Blocks competition registration if the athlete
 * does not have a validated medical certificate.
 *
 * Usage:
 *   router.post('/:competitionId/registrations', requireMedicalCertificate, handler);
 *
 * Expects req.body.athleteId to be set.
 */
export async function requireMedicalCertificate(req, res, next) {
  try {
    const athleteId = req.body.athleteId;
    if (!athleteId) {
      return res.status(400).json({ message: 'Identifiant athlete requis pour verifier le certificat medical.' });
    }

    const medicalCert = await UploadAsset.findOne({
      ownerType: 'Athlete',
      owner: athleteId,
      category: 'medical_certificate',
      status: 'approved'
    }).lean();

    if (!medicalCert) {
      return res.status(403).json({
        message: 'Certificat medical non valide.',
        detail: 'L\'athlete doit disposer d\'un certificat medical approuve (statut VALIDATED) avant de pouvoir s\'inscrire a une competition.',
        requiredDocument: 'medical_certificate',
        requiredStatus: 'approved'
      });
    }

    // Check expiry if set
    if (medicalCert.expiresAt && new Date(medicalCert.expiresAt) < new Date()) {
      return res.status(403).json({
        message: 'Le certificat medical de l\'athlete a expire.',
        detail: 'Veuillez televerser un nouveau certificat medical valide.',
        expiredAt: medicalCert.expiresAt
      });
    }

    // Attach the certificate info for downstream use
    req.medicalCertificate = medicalCert;
    next();
  } catch (error) {
    console.error('[requireMedicalCertificate]', error);
    return res.status(500).json({ message: 'Erreur lors de la verification du certificat medical.' });
  }
}

/**
 * Express middleware: Blocks an athlete from being marked as active
 * unless they hold an independent, unique federal license for the
 * current season.
 *
 * Usage:
 *   router.patch('/athletes/:id', requireActiveLicense, handler);
 *
 * Inspects req.body for licenseStatus or isActive changes.
 * Also checks the existing athlete record for the current license.
 */
export async function requireActiveLicense(req, res, next) {
  try {
    const athleteId = req.params.id || req.body.athleteId;
    if (!athleteId) {
      // If no athleteId in params or body, skip — let the route handler handle it
      return next();
    }

    // Determine if this request is attempting to activate the athlete
    const body = req.body || {};
    const wantsToActivate =
      body.licenseStatus === 'ACTIVE' ||
      body.isActive === true;

    if (!wantsToActivate) {
      // Not an activation request — allow through
      return next();
    }

    const currentYear = new Date().getFullYear();

    // Look for an active license for the current season
    const activeLicense = await License.findOne({
      ownerType: 'ATHLETE',
      ownerId: athleteId,
      year: currentYear,
      status: 'ACTIVE'
    }).lean();

    if (!activeLicense) {
      return res.status(403).json({
        message: 'Licence federale requise.',
        detail: `L'athlete doit disposer d'une licence federale active pour la saison ${currentYear} avant de pouvoir etre active.`,
        requiredLicenseYear: currentYear
      });
    }

    // Attach license info
    req.activeLicense = activeLicense;
    next();
  } catch (error) {
    console.error('[requireActiveLicense]', error);
    return res.status(500).json({ message: 'Erreur lors de la verification de la licence federale.' });
  }
}

/**
 * Express middleware: Block athlete competition registration if the
 * athlete does not hold an active federal license for the current season.
 *
 * Intended to be used as an additional guard on registration endpoints.
 */
export async function requireLicenseForRegistration(req, res, next) {
  try {
    const athleteId = req.body.athleteId;
    if (!athleteId) {
      return next(); // Skip if no athleteId — let validation happen downstream
    }

    const currentYear = new Date().getFullYear();

    const activeLicense = await License.findOne({
      ownerType: 'ATHLETE',
      ownerId: athleteId,
      year: currentYear,
      status: 'ACTIVE'
    }).lean();

    if (!activeLicense) {
      return res.status(403).json({
        message: 'Licence federale requise pour l\'inscription.',
        detail: `L'athlete doit disposer d'une licence federale active pour la saison ${currentYear} pour participer aux competitions.`,
        requiredLicenseYear: currentYear
      });
    }

    req.activeLicense = activeLicense;
    next();
  } catch (error) {
    console.error('[requireLicenseForRegistration]', error);
    return res.status(500).json({ message: 'Erreur lors de la verification de la licence.' });
  }
}

/**
 * Higher-order guard: chains multiple compliance checks.
 * Used to enforce all compliance rules on a single endpoint.
 *
 * Usage:
 *   router.post('/...', complianceGuard(['medical', 'license']), handler);
 */
export function complianceGuard(checks = []) {
  const guards = [];
  if (checks.includes('medical')) guards.push(requireMedicalCertificate);
  if (checks.includes('license')) guards.push(requireLicenseForRegistration);

  return async function (req, res, next) {
    try {
      for (const guard of guards) {
        let passed = false;
        await guard(req, res, (err) => {
          if (err) throw err;
          passed = true;
        });
        if (!passed && res.headersSent) return; // Guard already sent a response
        if (!passed) return; // should not happen
      }
      next();
    } catch (error) {
      // If a guard calls next(error), let Express error handler deal with it
      next(error);
    }
  };
}
