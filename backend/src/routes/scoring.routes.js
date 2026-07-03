import { Router } from 'express';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import {
  listSessions,
  getSession,
  createSession,
  startSession,
  pauseSession,
  resumeSession,
  doctorTime,
  waitingTime,
  genericAction,
  finishSession,
  validateSession,
  undoSessionAction,
  getPublicSession,
  getPublicSessionByFight,
  listPublicSessions,
  getRuleset,
  getScoringSettings
} from '../controllers/scoring.controller.js';

const router = Router();

const scoringRoles = ['SUPER_ADMIN', 'FEDERATION_ADMIN', 'COMPETITION_MANAGER', 'REFEREE', 'TABLE_OPERATOR'];
const validateRoles = ['SUPER_ADMIN', 'FEDERATION_ADMIN', 'COMPETITION_MANAGER', 'REFEREE'];

// Protected session management
router.get('/sessions', protect, allowRoles(...scoringRoles), listSessions);
router.get('/sessions/:id', protect, allowRoles(...scoringRoles), getSession);
router.post('/sessions', protect, allowRoles(...scoringRoles), createSession);

// Timer control actions
router.patch('/sessions/:id/start', protect, allowRoles(...scoringRoles), startSession);
router.patch('/sessions/:id/pause', protect, allowRoles(...scoringRoles), pauseSession);
router.patch('/sessions/:id/resume', protect, allowRoles(...scoringRoles), resumeSession);
router.patch('/sessions/:id/doctor-time', protect, allowRoles(...scoringRoles), doctorTime);
router.patch('/sessions/:id/waiting-time', protect, allowRoles(...scoringRoles), waitingTime);

// Generic scoring action (points, advantages, penalties, warnings, disqualifications)
router.patch('/sessions/:id/action', protect, allowRoles(...scoringRoles), genericAction);

// Finish and validate
router.patch('/sessions/:id/finish', protect, allowRoles(...scoringRoles), finishSession);
router.patch('/sessions/:id/validate', protect, allowRoles(...validateRoles), validateSession);
router.patch('/sessions/:id/undo', protect, allowRoles(...scoringRoles), undoSessionAction);

// Public endpoints (no auth required) — must come before protected :id routes
router.get('/sessions/:id/public', getPublicSession);
router.get('/fight/:fightId/public', getPublicSessionByFight);
router.get('/public/sessions', listPublicSessions);

// Rulesets and settings
router.get('/rulesets/:discipline', protect, allowRoles(...scoringRoles), getRuleset);
router.get('/settings', protect, allowRoles(...scoringRoles), getScoringSettings);

export default router;
