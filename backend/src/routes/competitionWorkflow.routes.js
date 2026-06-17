import { Router } from 'express';
import Competition from '../models/Competition.js';
import CompetitionRegistration from '../models/CompetitionRegistration.js';
import ClubCompetitionRegistration from '../models/ClubCompetitionRegistration.js';
import Category from '../models/Category.js';
import Bracket from '../models/Bracket.js';
import Fight from '../models/Fight.js';
import Athlete from '../models/Athlete.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';
import { buildOfficialCategories } from '../competition/categoryEngine.js';
import { generateSingleEliminationBracket } from '../competition/bracketSeeding.service.js';

const router = Router();
const adminRoles = ['SUPER_ADMIN','FEDERATION_ADMIN','COMPETITION_MANAGER'];
const scoringRoles = [...adminRoles, 'REFEREE', 'TABLE_OPERATOR'];
function scope(req) { return req.user?.federation && req.user.role !== 'SUPER_ADMIN' ? { federation: req.user.federation } : {}; }

router.get('/:competitionId/registrations', protect, async (req, res) => {
  const query = { competitionId: req.params.competitionId, ...scope(req) };
  if (req.user.role === 'CLUB_ADMIN' && req.user.club) query.clubId = req.user.club;
  res.json(await CompetitionRegistration.find(query).populate('clubId athleteId submittedBy').sort({ createdAt: -1 }));
});

router.post('/:competitionId/registrations', protect, allowRoles('SUPER_ADMIN','FEDERATION_ADMIN','COMPETITION_MANAGER','CLUB_ADMIN','COACH'), async (req, res) => {
  const payload = { ...req.body, competitionId: req.params.competitionId, submittedBy: req.user._id, ...scope(req) };
  if (!payload.clubId && req.user.club) payload.clubId = req.user.club;
  if (payload.athleteId && (!payload.firstName || !payload.lastName)) {
    const athlete = await Athlete.findById(payload.athleteId);
    if (athlete) Object.assign(payload, { firstName: athlete.firstName, lastName: athlete.lastName, gender: athlete.gender, clubId: payload.clubId || athlete.club, belt: athlete.belt, licenseNumber: athlete.licenseNumber, licenseStatus: athlete.licenseStatus, weightDeclared: payload.weightDeclared || athlete.weight });
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
  const reg = await CompetitionRegistration.findByIdAndUpdate(req.params.id, { ...req.body, status: req.body.status || 'modified' }, { new: true, runValidators: true });
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
router.get('/:competitionId/brackets', protect, async (req, res) => res.json(await Bracket.find({ competitionId: req.params.competitionId, ...scope(req) }).populate('categoryId seeds.athlete').sort('createdAt')));
router.post('/:competitionId/brackets/send-to-live', protect, allowRoles(...adminRoles), async (req, res) => {
  const brackets = await Bracket.find({ competitionId: req.params.competitionId, ...scope(req) }).populate('categoryId');
  const fights = [];
  for (const bracket of brackets) {
    const firstRound = bracket.rounds?.[0]?.matches || [];
    for (const match of firstRound) {
      const fight = await Fight.create({ ...scope(req), competition: req.params.competitionId, category: bracket.name, redAthlete: match.redAthlete, blueAthlete: match.blueAthlete, mat: req.body.mat || 'Tatami 1', status: 'SCHEDULED' });
      fights.push(fight);
    }
  }
  await audit({ actor: req.user._id, action: 'BRACKETS_SENT_TO_LIVE', entity: 'Competition', entityId: req.params.competitionId, metadata: { fights: fights.length } });
  res.status(201).json(fights);
});
export default router;
