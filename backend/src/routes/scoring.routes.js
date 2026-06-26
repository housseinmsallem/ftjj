import { Router } from 'express';
import ScoringSession from '../models/ScoringSession.js';
import ScoringActionLog from '../models/ScoringActionLog.js';
import Fight from '../models/Fight.js';
import Athlete from '../models/Athlete.js';
import Ranking from '../models/Ranking.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';
import { applyScoringAction } from '../scoring/scoringEngine.js';
import { advanceWinnerInBracket } from '../competition/bracketAdvancement.service.js';

const router = Router();
const roles = ['SUPER_ADMIN','FEDERATION_ADMIN','COMPETITION_MANAGER','REFEREE','TABLE_OPERATOR'];
function scope(req) { return req.user?.federation && req.user.role !== 'SUPER_ADMIN' ? { federation: req.user.federation } : {}; }
function publicPayload(session) { return session.populate ? session.populate('fight competition') : session; }
async function logAndEmit(req, session, action, previousState) {
  const saved = await ScoringSession.findById(session._id).populate({ path: 'fight', populate: 'redAthlete blueAthlete winner' }).populate('competition');
  await ScoringActionLog.create({ ...scope(req), fightId: saved.fight?._id || saved.fight, scoringSessionId: saved._id, actorUserId: req.user._id, side: action.side || 'neutral', actionType: action.type || action.actionType, value: action.value, remainingSeconds: saved.remainingSeconds, previousState, newState: saved.toObject(), comment: action.comment });
  req.app.get('io')?.to(`fight:${saved.fight?._id || saved.fight}`).emit('scoring:update', saved);
  req.app.get('io')?.emit('dashboard:live:update', { session: saved._id, status: saved.status });
  return saved;
}
router.get('/sessions', protect, allowRoles(...roles), async (req, res) => res.json(await ScoringSession.find({ ...scope(req) }).populate({ path: 'fight', populate: 'redAthlete blueAthlete winner' }).populate('competition').sort({ updatedAt: -1 })));
router.get('/sessions/:id', protect, allowRoles(...roles), async (req, res) => res.json(await ScoringSession.findOne({ _id: req.params.id, ...scope(req) }).populate({ path: 'fight', populate: 'redAthlete blueAthlete winner' }).populate('competition')));
router.post('/sessions', protect, allowRoles(...roles), async (req, res) => {
  const fight = await Fight.findById(req.body.fight || req.body.fightId);
  if (!fight) return res.status(404).json({ message: 'Combat introuvable' });
  const session = await ScoringSession.create({ ...scope(req), fight: fight._id, competition: fight.competition, discipline: req.body.discipline || 'NEWAZA', controlledBy: req.user._id, durationSeconds: req.body.durationSeconds || 300, remainingSeconds: req.body.durationSeconds || 300 });
  await audit({ actor: req.user._id, action: 'SCORING_SESSION_CREATED', entity: 'ScoringSession', entityId: session._id });
  res.status(201).json(session);
});
async function actionPatch(req, res, action) {
  const session = await ScoringSession.findOne({ _id: req.params.id, ...scope(req) });
  if (!session) return res.status(404).json({ message: 'Session introuvable' });
  if (session.status === 'validated' && !['SUPER_ADMIN','FEDERATION_ADMIN'].includes(req.user.role)) return res.status(409).json({ message: 'Combat valide verrouille' });
  const previousState = session.toObject();
  const next = applyScoringAction(session, action);
  Object.assign(session, next);
  await session.save();
  const saved = await logAndEmit(req, session, action, previousState);
  await audit({ actor: req.user._id, action: `SCORING_${(action.type || action.actionType).toUpperCase()}`, entity: 'ScoringSession', entityId: session._id, metadata: action });
  res.json(saved);
}
router.patch('/sessions/:id/start', protect, allowRoles(...roles), (req, res) => actionPatch(req, res, { type: 'start' }));
router.patch('/sessions/:id/pause', protect, allowRoles(...roles), (req, res) => actionPatch(req, res, { type: 'pause' }));
router.patch('/sessions/:id/resume', protect, allowRoles(...roles), (req, res) => actionPatch(req, res, { type: 'resume' }));
router.patch('/sessions/:id/doctor-time', protect, allowRoles(...roles), (req, res) => actionPatch(req, res, { type: 'doctor_time' }));
router.patch('/sessions/:id/waiting-time', protect, allowRoles(...roles), (req, res) => actionPatch(req, res, { type: 'waiting_time' }));
router.patch('/sessions/:id/action', protect, allowRoles(...roles), (req, res) => actionPatch(req, res, req.body));
router.patch('/sessions/:id/finish', protect, allowRoles(...roles), (req, res) => actionPatch(req, res, { type: 'finish', winnerSide: req.body.winnerSide, winMethod: req.body.winMethod || 'points' }));
router.patch('/sessions/:id/undo', protect, allowRoles(...roles), async (req, res) => {
  const last = await ScoringActionLog.findOne({ scoringSessionId: req.params.id, ...scope(req) }).sort({ createdAt: -1 });
  if (!last) return res.status(404).json({ message: 'Aucune action a annuler' });
  const session = await ScoringSession.findByIdAndUpdate(req.params.id, last.previousState, { new: true });
  await last.deleteOne();
  req.app.get('io')?.emit('scoring:update', session);
  res.json(session);
});
router.patch('/sessions/:id/validate', protect, allowRoles('SUPER_ADMIN','FEDERATION_ADMIN','COMPETITION_MANAGER','REFEREE'), async (req, res) => {
  const session = await ScoringSession.findOne({ _id: req.params.id, ...scope(req) }).populate('fight');
  if (!session) return res.status(404).json({ message: 'Session introuvable' });
  session.status = 'validated'; session.validatedBy = req.user._id; session.validatedAt = new Date();
  await session.save();
  if (session.fight) {
    const winnerId = session.winnerSide === 'red' ? session.fight.redAthlete : session.winnerSide === 'blue' ? session.fight.blueAthlete : null;
    await Fight.findByIdAndUpdate(session.fight._id, { status: 'FINISHED', redScore: session.red.score, blueScore: session.blue.score, winner: winnerId });
    if (winnerId) {
      await Athlete.findByIdAndUpdate(winnerId, { $inc: { rankingPoints: 10 } });
      await Ranking.findOneAndUpdate({ athlete: winnerId, discipline: session.discipline, season: new Date().getFullYear(), ...scope(req) }, { $inc: { points: 10, wins: 1 }, $setOnInsert: { club: session.winnerSide === 'red' ? session.fight.redAthlete?.club : session.fight.blueAthlete?.club } }, { upsert: true });
      try {
        await advanceWinnerInBracket(session.fight._id, winnerId);
      } catch (bracketErr) {
        console.error('[Bracket Advancement] Failed to advance winner:', bracketErr);
      }
    }
  }
  await audit({ actor: req.user._id, action: 'SCORING_RESULT_VALIDATED', entity: 'ScoringSession', entityId: session._id });
  req.app.get('io')?.to(`fight:${session.fight?._id || session.fight}`).emit('scoring:validated', session);
  res.json(session);
});
router.get('/sessions/:id/public', async (req, res) => res.json(await ScoringSession.findById(req.params.id).populate({ path: 'fight', populate: 'redAthlete blueAthlete winner' }).populate('competition')));
router.get('/fight/:fightId/public', async (req, res) => res.json(await ScoringSession.findOne({ fight: req.params.fightId }).populate({ path: 'fight', populate: 'redAthlete blueAthlete winner' }).populate('competition')));
export default router;
