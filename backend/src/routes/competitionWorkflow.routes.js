import { Router } from 'express';
import Competition from '../models/Competition.js';
import CompetitionRegistration from '../models/CompetitionRegistration.js';
import ClubCompetitionRegistration from '../models/ClubCompetitionRegistration.js';
import Category from '../models/Category.js';
import Bracket from '../models/Bracket.js';
import Fight from '../models/Fight.js';
import Athlete from '../models/Athlete.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { requireMedicalCertificate, requireLicenseForRegistration } from '../middlewares/compliance.guard.js';
import { audit } from '../utils/audit.js';
import { buildOfficialCategories, enrichRegistrationFromAthlete, rederiveRegistrationCategories } from '../competition/categoryEngine.js';
import { generateSingleEliminationBracket } from '../competition/bracketSeeding.service.js';
import { processBracketAdvancement } from '../competition/bracketAdvancement.service.js';

const router = Router();
const adminRoles = ['SUPER_ADMIN','FEDERATION_ADMIN','COMPETITION_MANAGER'];
function scope(req) { return req.user?.federation && req.user.role !== 'SUPER_ADMIN' ? { federation: req.user.federation } : {}; }

async function applyAthleteEnrichment(payload, athleteId) {
  if (!athleteId) return payload;
  const athlete = await Athlete.findById(athleteId);
  if (!athlete) return payload;
  return enrichRegistrationFromAthlete(payload, athlete);
}

router.get('/:competitionId/registrations', protect, async (req, res) => {
  const query = { competitionId: req.params.competitionId, ...scope(req) };
  if (req.user.role === 'CLUB_ADMIN' && req.user.club) query.clubId = req.user.club;
  res.json(await CompetitionRegistration.find(query).populate('clubId athleteId submittedBy').sort({ createdAt: -1 }));
});

router.post('/:competitionId/registrations', protect, allowRoles('SUPER_ADMIN','FEDERATION_ADMIN','COMPETITION_MANAGER','CLUB_ADMIN','COACH'), requireMedicalCertificate, requireLicenseForRegistration, async (req, res) => {
  let payload = { ...req.body, competitionId: req.params.competitionId, submittedBy: req.user._id, ...scope(req) };
  if (!payload.clubId && req.user.club) payload.clubId = req.user.club;

  if (adminRoles.includes(req.user.role) && !payload.athleteId) {
    return res.status(400).json({ message: 'Un athlete doit etre selectionne pour cette inscription' });
  }

  if (payload.athleteId) {
    const duplicate = await CompetitionRegistration.findOne({
      competitionId: req.params.competitionId,
      athleteId: payload.athleteId,
      discipline: payload.discipline || 'NEWAZA',
      ...scope(req),
    });
    if (duplicate) {
      return res.status(409).json({ message: 'Cet athlete est deja inscrit a cette discipline pour cette competition' });
    }
    payload = await applyAthleteEnrichment(payload, payload.athleteId);
  }

  const reg = await CompetitionRegistration.create(payload);
  await ClubCompetitionRegistration.findOneAndUpdate({ competitionId: req.params.competitionId, clubId: reg.clubId, ...scope(req) }, { $addToSet: { athletes: reg._id }, status: 'submitted', submittedAt: new Date(), submittedBy: req.user._id }, { upsert: true, new: true });
  await audit({ actor: req.user._id, action: 'COMPETITION_REGISTRATION_CREATED', entity: 'CompetitionRegistration', entityId: reg._id });
  res.status(201).json(reg);
});

router.patch('/registrations/:id', protect, async (req, res) => {
  const current = await CompetitionRegistration.findOne({ _id: req.params.id, ...scope(req) });
  if (!current) return res.status(404).json({ message: 'Inscription introuvable' });
  if (req.user.role === 'CLUB_ADMIN' && String(current.clubId) !== String(req.user.club)) return res.status(403).json({ message: 'Acces non autorise' });

  let updates = { ...req.body, status: req.body.status || 'modified' };
  const athleteChanged = updates.athleteId && String(updates.athleteId) !== String(current.athleteId);
  const weightChanged = updates.weightDeclared != null || updates.weightVerified != null;

  if (athleteChanged) {
    updates = await applyAthleteEnrichment({ ...current.toObject(), ...updates }, updates.athleteId);
  } else if (weightChanged || updates.discipline) {
    const merged = { ...current.toObject(), ...updates };
    if (updates.discipline && current.athleteId) {
      const athlete = await Athlete.findById(current.athleteId);
      if (athlete) {
        updates.belt = updates.discipline === 'NEWAZA'
          ? (athlete.newazaBelt || athlete.belt || 'WHITE')
          : (athlete.jiujitsuBelt || athlete.belt || 'WHITE');
      }
    }
    const derived = rederiveRegistrationCategories(merged);
    updates.ageCategory = derived.ageCategory;
    updates.weightCategory = derived.weightCategory;
  }

  const reg = await CompetitionRegistration.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  await audit({ actor: req.user._id, action: 'COMPETITION_REGISTRATION_UPDATED', entity: 'CompetitionRegistration', entityId: reg._id, metadata: req.body });
  res.json(reg);
});

router.patch('/registrations/:id/approve', protect, allowRoles(...adminRoles), async (req, res) => {
  const reg = await CompetitionRegistration.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { status: 'approved', federationDecision: 'approved', federationComment: req.body.comment, $push: { validationHistory: { status: 'approved', comment: req.body.comment, actor: req.user._id } } }, { new: true });
  await audit({ actor: req.user._id, action: 'REGISTRATION_APPROVED', entity: 'CompetitionRegistration', entityId: reg?._id });
  res.json(reg);
});

router.patch('/registrations/:id/reject', protect, allowRoles(...adminRoles), async (req, res) => {
  const reg = await CompetitionRegistration.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { status: 'rejected', federationDecision: 'rejected', federationComment: req.body.comment, $push: { validationHistory: { status: 'rejected', comment: req.body.comment, actor: req.user._id } } }, { new: true });
  await audit({ actor: req.user._id, action: 'REGISTRATION_REJECTED', entity: 'CompetitionRegistration', entityId: reg?._id });
  res.json(reg);
});

router.post('/:competitionId/registrations/validate-all', protect, allowRoles(...adminRoles), async (req, res) => {
  const result = await CompetitionRegistration.updateMany({ competitionId: req.params.competitionId, status: { $in: ['submitted','pending_validation','modified'] }, ...scope(req) }, { status: 'approved', federationDecision: 'approved', $push: { validationHistory: { status: 'approved', comment: 'Validation globale', actor: req.user._id } } });
  await audit({ actor: req.user._id, action: 'REGISTRATIONS_VALIDATE_ALL', entity: 'Competition', entityId: req.params.competitionId, metadata: result });
  res.json(result);
});

router.get('/:competitionId/category-preview', protect, allowRoles(...adminRoles), async (req, res) => {
  const competition = await Competition.findOne({ _id: req.params.competitionId, ...scope(req) });
  if (!competition) return res.status(404).json({ message: 'Competition introuvable' });
  const registrations = await CompetitionRegistration.find({ competitionId: competition._id, status: 'approved', ...scope(req) });
  const notApproved = await CompetitionRegistration.countDocuments({ competitionId: competition._id, status: { $ne: 'approved' }, ...scope(req) });
  res.json({
    preview: buildOfficialCategories(registrations, competition),
    approvedCount: registrations.length,
    notApprovedCount: notApproved,
    ready: notApproved === 0 && registrations.length > 0,
  });
});

router.post('/:competitionId/generate-categories', protect, allowRoles(...adminRoles), async (req, res) => {
  const competition = await Competition.findOne({ _id: req.params.competitionId, ...scope(req) });
  if (!competition) return res.status(404).json({ message: 'Competition introuvable' });
  const notApproved = await CompetitionRegistration.countDocuments({ competitionId: competition._id, status: { $ne: 'approved' }, ...scope(req) });
  if (notApproved > 0) return res.status(409).json({ message: 'Toutes les inscriptions doivent etre validees avant generation des categories', notApproved });
  const registrations = await CompetitionRegistration.find({ competitionId: competition._id, status: 'approved', ...scope(req) });
  await Category.deleteMany({ competitionId: competition._id, ...scope(req) });
  const categories = await Category.insertMany(buildOfficialCategories(registrations, competition).map((cat, index) => ({ ...cat, competitionId: competition._id, federation: competition.federation, order: index + 1 })));
  competition.status = 'ready_for_brackets';
  await competition.save();
  await audit({ actor: req.user._id, action: 'CATEGORIES_GENERATED', entity: 'Competition', entityId: competition._id, metadata: { count: categories.length } });
  res.json(categories);
});

router.post('/:competitionId/generate-brackets', protect, allowRoles(...adminRoles), async (req, res) => {
  const competition = await Competition.findOne({ _id: req.params.competitionId, ...scope(req) });
  if (!competition) return res.status(404).json({ message: 'Competition introuvable' });
  const categories = await Category.find({ competitionId: competition._id, ...scope(req) }).populate({ path: 'registrations', populate: { path: 'athleteId clubId' } });
  await Bracket.deleteMany({ competitionId: competition._id, ...scope(req) });
  const created = [];
  for (const category of categories) {
    const athleteEntries = category.registrations.map((reg) => ({ _id: reg.athleteId?._id || reg.athleteId, club: reg.clubId?._id || reg.clubId, registration: reg._id })).filter((entry) => entry._id);
    const generated = generateSingleEliminationBracket(athleteEntries, { categoryId: category._id });
    const bracket = await Bracket.create({ ...scope(req), competitionId: competition._id, categoryId: category._id, name: category.name, ...generated, seeds: generated.seeds.map((seed) => ({ position: seed.position, athlete: seed.athlete?._id || seed.athlete || null, club: seed.athlete?.club || null, registration: seed.athlete?.registration || null })), status: generated.firstRoundClubConflicts ? 'needs_review' : 'generated' });
    if (generated.firstRoundClubConflicts) { category.status = 'needs_review'; category.warnings = generated.warnings; await category.save(); }
    created.push(bracket);
  }
  competition.status = 'brackets_generated';
  await competition.save();
  await audit({ actor: req.user._id, action: 'BRACKETS_GENERATED', entity: 'Competition', entityId: competition._id, metadata: { count: created.length } });
  res.json(created);
});

router.patch('/:competitionId/lock-brackets', protect, allowRoles(...adminRoles), async (req, res) => {
  const result = await Bracket.updateMany({ competitionId: req.params.competitionId, ...scope(req) }, { status: 'locked', lockedBy: req.user._id, lockedAt: new Date() });
  await audit({ actor: req.user._id, action: 'BRACKETS_LOCKED', entity: 'Competition', entityId: req.params.competitionId });
  res.json(result);
});

router.patch('/:competitionId/publish-brackets', protect, allowRoles(...adminRoles), async (req, res) => {
  const result = await Bracket.updateMany({ competitionId: req.params.competitionId, status: { $in: ['locked','generated','needs_review'] }, ...scope(req) }, { status: 'published', publishedAt: new Date() });
  await audit({ actor: req.user._id, action: 'BRACKETS_PUBLISHED', entity: 'Competition', entityId: req.params.competitionId });
  res.json(result);
});

router.get('/:competitionId/categories', protect, async (req, res) => res.json(await Category.find({ competitionId: req.params.competitionId, ...scope(req) }).sort('order')));
router.get('/:competitionId/brackets', protect, async (req, res) => res.json(await Bracket.find({ competitionId: req.params.competitionId, ...scope(req) }).populate('categoryId seeds.athlete rounds.matches.redAthlete rounds.matches.blueAthlete').sort('createdAt')));

// Update bracket match with fight ID
router.patch('/brackets/:bracketId/matches/:matchId', protect, allowRoles(...adminRoles), async (req, res) => {
  const bracket = await Bracket.findOne({ _id: req.params.bracketId, ...scope(req) });
  if (!bracket) return res.status(404).json({ message: 'Arbre introuvable' });

  // Find and update the specific match
  let matchFound = false;
  for (const round of bracket.rounds) {
    const match = round.matches.find(m => String(m._id) === String(req.params.matchId) || m.matchNumber === parseInt(req.params.matchId));
    if (match) {
      Object.assign(match, req.body);
      matchFound = true;
      break;
    }
  }

  if (!matchFound) return res.status(404).json({ message: 'Match introuvable dans l\'arbre' });

  await bracket.save();
  await audit({ actor: req.user._id, action: 'BRACKET_MATCH_UPDATED', entity: 'Bracket', entityId: bracket._id, metadata: { matchId: req.params.matchId, updates: req.body } });
  res.json(bracket);
});

// Swap athletes in bracket seeds (manual adjustment)
router.patch('/brackets/:bracketId/seeds/swap', protect, allowRoles(...adminRoles), async (req, res) => {
  const { seedPosition1, seedPosition2 } = req.body;
  const bracket = await Bracket.findOne({ _id: req.params.bracketId, ...scope(req) });
  if (!bracket) return res.status(404).json({ message: 'Arbre introuvable' });

  const seed1 = bracket.seeds.find(s => s.position === seedPosition1);
  const seed2 = bracket.seeds.find(s => s.position === seedPosition2);

  if (!seed1 || !seed2) return res.status(404).json({ message: 'Semences introuvables' });

  // Swap athlete data
  const tempAthlete = seed1.athlete;
  const tempClub = seed1.club;
  const tempRegistration = seed1.registration;

  seed1.athlete = seed2.athlete;
  seed1.club = seed2.club;
  seed1.registration = seed2.registration;

  seed2.athlete = tempAthlete;
  seed2.club = tempClub;
  seed2.registration = tempRegistration;

  // Update matches in rounds to reflect the swap
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (match.redSeed === seedPosition1) {
        match.redAthlete = seed1.athlete;
      } else if (match.redSeed === seedPosition2) {
        match.redAthlete = seed2.athlete;
      }
      if (match.blueSeed === seedPosition1) {
        match.blueAthlete = seed1.athlete;
      } else if (match.blueSeed === seedPosition2) {
        match.blueAthlete = seed2.athlete;
      }
    }
  }

  bracket.status = 'needs_review';
  await bracket.save();
  await audit({ actor: req.user._id, action: 'BRACKET_SEEDS_SWAPPED', entity: 'Bracket', entityId: bracket._id, metadata: { seedPosition1, seedPosition2 } });
  res.json(bracket);
});

router.post('/:competitionId/brackets/send-to-live', protect, allowRoles(...adminRoles), async (req, res) => {
  const brackets = await Bracket.find({ competitionId: req.params.competitionId, ...scope(req) });
  for (const bracket of brackets) {
    await processBracketAdvancement(bracket);
  }
  const fights = await Fight.find({ competition: req.params.competitionId });
  await audit({ actor: req.user._id, action: 'BRACKETS_SENT_TO_LIVE', entity: 'Competition', entityId: req.params.competitionId, metadata: { fights: fights.length } });
  res.status(201).json(fights);
});
export default router;
