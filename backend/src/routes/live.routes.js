import { Router } from 'express';
import MatchBracket from '../models/MatchBracket.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';

const router = Router();
router.get('/public/matches', async (req, res) => res.json(await MatchBracket.find({ status: { $in: ['scheduled','live','finished'] } }).populate('competition redAthlete blueAthlete winner').sort('order createdAt').limit(100)));
router.get('/matches', protect, async (req, res) => res.json(await MatchBracket.find().populate('competition redAthlete blueAthlete winner').sort('order createdAt')));
router.post('/matches', protect, allowRoles('FEDERATION_ADMIN','REFEREE'), async (req, res) => {
  const match = await MatchBracket.create(req.body);
  req.app.get('io')?.emit('match:created', match);
  await audit({ actor: req.user._id, action: 'MATCH_CREATED', entity: 'MatchBracket', entityId: match._id });
  res.status(201).json(match);
});
router.patch('/matches/:id', protect, allowRoles('FEDERATION_ADMIN','REFEREE'), async (req, res) => {
  const match = await MatchBracket.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('competition redAthlete blueAthlete winner');
  if (!match) return res.status(404).json({ message: 'Combat introuvable' });
  req.app.get('io')?.emit('match:updated', match);
  await audit({ actor: req.user._id, action: 'MATCH_UPDATED', entity: 'MatchBracket', entityId: match._id, meta: req.body });
  res.json(match);
});
router.post('/matches/:id/timer/:action', protect, allowRoles('FEDERATION_ADMIN','REFEREE'), async (req, res) => {
  const action = req.params.action;
  const patch = action === 'start' ? { timerState: 'running', status: 'live', startedAt: new Date() } : action === 'pause' ? { timerState: 'paused' } : action === 'finish' ? { timerState: 'finished', status: 'finished', finishedAt: new Date() } : { timerState: 'idle' };
  const match = await MatchBracket.findByIdAndUpdate(req.params.id, patch, { new: true }).populate('competition redAthlete blueAthlete winner');
  if (!match) return res.status(404).json({ message: 'Combat introuvable' });
  req.app.get('io')?.emit('match:timer', { id: match._id, action, match });
  await audit({ actor: req.user._id, action: `MATCH_TIMER_${action.toUpperCase()}`, entity: 'MatchBracket', entityId: match._id });
  res.json(match);
});
export default router;
