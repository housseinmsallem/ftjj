import ScoringSession from '../models/ScoringSession.js';
import ScoringActionLog from '../models/ScoringActionLog.js';
import ScoringSettings from '../models/ScoringSettings.js';
import Fight from '../models/Fight.js';
import Athlete from '../models/Athlete.js';
import Ranking from '../models/Ranking.js';
import Bracket from '../models/Bracket.js';
import Competition from '../models/Competition.js';
import { applyScoringAction, getRulesetForDiscipline } from '../scoring/scoringEngine.js';
import { advanceWinnerInBracket, processBracketAdvancement } from '../competition/bracketAdvancement.service.js';
import { audit } from '../utils/audit.js';

// ---------- Helpers ----------

function scope(req) {
  return req.user?.federation && req.user.role !== 'SUPER_ADMIN'
    ? { federation: req.user.federation }
    : {};
}

function enrichSessionPopulate(query) {
  return query
    .populate({ path: 'fight', populate: { path: 'redAthlete blueAthlete winner', populate: { path: 'club' } } })
    .populate('competition')
    .populate('controlledBy', 'name email role')
    .populate('validatedBy', 'name email role');
}

async function logAction(req, session, action, previousState) {
  const saved = await enrichSessionPopulate(ScoringSession.findById(session._id));
  await ScoringActionLog.create({
    ...scope(req),
    fightId: saved.fight?._id || saved.fight,
    scoringSessionId: saved._id,
    actorUserId: req.user._id,
    side: action.side || 'neutral',
    actionType: action.type || action.actionType,
    value: action.value,
    remainingSeconds: saved.remainingSeconds,
    previousState,
    newState: saved.toObject(),
    comment: action.comment || action.reason || ''
  });
  return saved;
}

function emitScoringUpdate(req, session) {
  const io = req.app.get('io');
  if (!io) return;
  const fightId = session.fight?._id || session.fight;
  // Room-specific for the LiveMatch dialog
  if (fightId) {
    io.to(`fight:${fightId}`).emit('scoring:update', session);
  }
  // Global broadcast so admin dashboards reflect changes in real-time
  io.emit('scoring:update', session);
  io.emit('dashboard:scoring:update', { sessionId: session._id, status: session.status, fightId });
}

function emitPublicUpdate(req, session) {
  const io = req.app.get('io');
  if (!io) return;
  io.emit('public:scoring:update', {
    sessionId: session._id,
    status: session.status,
    mat: session.mat,
    redScore: session.red?.score || 0,
    blueScore: session.blue?.score || 0,
    timerState: session.timerState,
    remainingSeconds: session.remainingSeconds,
    winnerSide: session.winnerSide,
    winMethod: session.winMethod
  });
}

// ---------- Controller Methods ----------

export const listSessions = async (req, res) => {
  try {
    const filter = { ...scope(req) };
    if (req.query.competition) filter.competition = req.query.competition;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.mat) filter.mat = req.query.mat;

    const sessions = await enrichSessionPopulate(
      ScoringSession.find(filter).sort({ updatedAt: -1 }).limit(100)
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la recuperation des sessions', error: err.message });
  }
};

export const getSession = async (req, res) => {
  try {
    const session = await enrichSessionPopulate(
      ScoringSession.findOne({ _id: req.params.id, ...scope(req) })
    );
    if (!session) return res.status(404).json({ message: 'Session introuvable' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la recuperation de la session', error: err.message });
  }
};

export const createSession = async (req, res) => {
  try {
    const { fightId, discipline, mat, round, category, durationSeconds } = req.body;

    let fight = null;
    let competitionId = null;

    if (fightId) {
      fight = await Fight.findById(fightId);
      if (!fight) return res.status(404).json({ message: 'Combat introuvable' });
      competitionId = fight.competition;
    }

    if (!fight && req.body.competition) {
      competitionId = req.body.competition;
    }

    const ruleset = getRulesetForDiscipline(discipline || 'NEWAZA');
    const dur = durationSeconds || ruleset.durationSeconds || 300;

    const session = await ScoringSession.create({
      ...scope(req),
      fight: fight?._id || null,
      competition: competitionId || null,
      discipline: discipline || 'NEWAZA',
      mat: mat || fight?.mat || 'Tatami 1',
      round: round || '',
      category: category || fight?.category || '',
      controlledBy: req.user._id,
      durationSeconds: dur,
      remainingSeconds: dur
    });

    // Update the Fight's status
    if (fight) {
      fight.status = 'LIVE';
      await fight.save();
    }

    // Update competition status to live if not already
    if (competitionId) {
      await Competition.findByIdAndUpdate(competitionId, { status: 'live', liveEnabled: true });
    }

    await audit({
      actor: req.user._id,
      action: 'SCORING_SESSION_CREATED',
      entity: 'ScoringSession',
      entityId: session._id,
      metadata: { fightId: fight?._id, discipline }
    });

    req.app.get('io')?.emit('scoring:sessionCreated', session);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la creation de la session', error: err.message });
  }
};

async function patchAction(req, res, action) {
  try {
    const session = await ScoringSession.findOne({ _id: req.params.id, ...scope(req) });
    if (!session) return res.status(404).json({ message: 'Session introuvable' });

    if (session.status === 'validated' && !['SUPER_ADMIN', 'FEDERATION_ADMIN'].includes(req.user.role)) {
      return res.status(409).json({ message: 'Cette session est validee et verrouillee' });
    }

    const previousState = session.toObject();
    const nextState = applyScoringAction(session, action);
    Object.assign(session, nextState);
    await session.save();

    const saved = await logAction(req, session, action, previousState);
    emitScoringUpdate(req, saved);
    emitPublicUpdate(req, saved);

    await audit({
      actor: req.user._id,
      action: `SCORING_${(action.type || action.actionType).toUpperCase()}`,
      entity: 'ScoringSession',
      entityId: session._id,
      metadata: action
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'action de scoring', error: err.message });
  }
}

export const startSession = (req, res) => patchAction(req, res, { type: 'start' });
export const pauseSession = (req, res) => patchAction(req, res, { type: 'pause' });
export const resumeSession = (req, res) => patchAction(req, res, { type: 'resume' });
export const doctorTime = (req, res) => patchAction(req, res, { type: 'doctor_time' });
export const waitingTime = (req, res) => patchAction(req, res, { type: 'waiting_time' });
export const genericAction = (req, res) => patchAction(req, res, { ...req.body, issuedBy: req.user._id });

export const finishSession = async (req, res) => {
  try {
    const session = await ScoringSession.findOne({ _id: req.params.id, ...scope(req) }).populate('fight');
    if (!session) return res.status(404).json({ message: 'Session introuvable' });

    const previousState = session.toObject();

    // Apply finish action with explicit winner info if provided
    const finishAction = {
      type: 'finish',
      winnerSide: req.body.winnerSide,
      winMethod: req.body.winMethod
    };

    const nextState = applyScoringAction(session, finishAction);
    Object.assign(session, nextState);
    await session.save();

    // Update the Fight record
    const fightRef = typeof session.fight === 'object' && session.fight !== null ? session.fight : null;
    const fightId = fightRef ? fightRef._id : session.fight;

    if (fightId) {
      const winnerId = session.winnerSide === 'red'
        ? (fightRef ? (fightRef.redAthlete?._id || fightRef.redAthlete) : null)
        : session.winnerSide === 'blue'
          ? (fightRef ? (fightRef.blueAthlete?._id || fightRef.blueAthlete) : null)
          : null;

      await Fight.findByIdAndUpdate(fightId, {
        status: 'FINISHED',
        redScore: session.red.score,
        blueScore: session.blue.score,
        winner: winnerId
      });

      // Advance winner in bracket
      if (winnerId && session.winnerSide !== 'draw') {
        try {
          await advanceWinnerInBracket(fightId, winnerId);
        } catch (bracketErr) {
          console.error('[Bracket Advancement] Failed to advance winner:', bracketErr.message);
        }
      }
    }

    const saved = await logAction(req, session, finishAction, previousState);
    emitScoringUpdate(req, saved);
    emitPublicUpdate(req, saved);

    await audit({
      actor: req.user._id,
      action: 'SCORING_FINISH',
      entity: 'ScoringSession',
      entityId: session._id,
      metadata: { winnerSide: session.winnerSide, winMethod: session.winMethod }
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la fin de la session', error: err.message });
  }
};

export const validateSession = async (req, res) => {
  try {
    const session = await ScoringSession.findOne({ _id: req.params.id, ...scope(req) }).populate('fight');
    if (!session) return res.status(404).json({ message: 'Session introuvable' });

    if (session.status !== 'finished') {
      return res.status(400).json({ message: 'La session doit etre terminee avant validation' });
    }

    session.status = 'validated';
    session.validatedBy = req.user._id;
    session.validatedAt = new Date();
    await session.save();

    // Update athlete rankings
    if (session.fight) {
      const fight = typeof session.fight === 'object' ? session.fight : await Fight.findById(session.fight).populate('redAthlete blueAthlete');
      const winnerId = session.winnerSide === 'red'
        ? (fight.redAthlete?._id || fight.redAthlete)
        : session.winnerSide === 'blue'
          ? (fight.blueAthlete?._id || fight.blueAthlete)
          : null;

      const loserId = session.winnerSide === 'red'
        ? (fight.blueAthlete?._id || fight.blueAthlete)
        : session.winnerSide === 'blue'
          ? (fight.redAthlete?._id || fight.redAthlete)
          : null;

      const discipline = session.discipline || 'NEWAZA';
      const season = new Date().getFullYear();

      // Increment winner stats
      if (winnerId) {
        const winner = await Athlete.findById(winnerId);
        await Athlete.findByIdAndUpdate(winnerId, { $inc: { rankingPoints: 10 } });

        await Ranking.findOneAndUpdate(
          { athlete: winnerId, discipline, season, ...scope(req) },
          {
            $inc: { points: 10, wins: 1, 'medals.gold': 1 },
            $setOnInsert: { club: winner?.club }
          },
          { upsert: true }
        );
      }

      // Increment loser stats
      if (loserId && session.winnerSide !== 'draw') {
        const loser = await Athlete.findById(loserId);
        await Ranking.findOneAndUpdate(
          { athlete: loserId, discipline, season, ...scope(req) },
          {
            $inc: { points: 3, losses: 1 },
            $setOnInsert: { club: loser?.club }
          },
          { upsert: true }
        );
      }
    }

    await audit({
      actor: req.user._id,
      action: 'SCORING_RESULT_VALIDATED',
      entity: 'ScoringSession',
      entityId: session._id
    });

    req.app.get('io')?.to(`fight:${session.fight?._id || session.fight}`).emit('scoring:validated', session);
    req.app.get('io')?.emit('dashboard:result:validated', { sessionId: session._id, winnerSide: session.winnerSide });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la validation', error: err.message });
  }
};

export const undoSessionAction = async (req, res) => {
  try {
    const last = await ScoringActionLog.findOne({
      scoringSessionId: req.params.id,
      ...scope(req)
    }).sort({ createdAt: -1 });

    if (!last) return res.status(404).json({ message: 'Aucune action a annuler' });

    const session = await ScoringSession.findByIdAndUpdate(
      req.params.id,
      last.previousState,
      { new: true }
    );
    await last.deleteOne();

    emitScoringUpdate(req, session);
    emitPublicUpdate(req, session);

    await audit({
      actor: req.user._id,
      action: 'SCORING_ACTION_UNDONE',
      entity: 'ScoringSession',
      entityId: session._id
    });

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'annulation', error: err.message });
  }
};

// Public endpoints (no auth required)
export const getPublicSession = async (req, res) => {
  try {
    const session = await enrichSessionPopulate(ScoringSession.findById(req.params.id));
    if (!session) return res.status(404).json({ message: 'Session introuvable' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};

export const getPublicSessionByFight = async (req, res) => {
  try {
    const session = await enrichSessionPopulate(
      ScoringSession.findOne({ fight: req.params.fightId, status: { $in: ['waiting', 'live', 'paused', 'finished', 'validated'] } })
    );
    if (!session) return res.status(404).json({ message: 'Aucune session active pour ce combat' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};

export const listPublicSessions = async (req, res) => {
  try {
    const filter = { status: { $in: ['live', 'paused', 'waiting', 'finished'] } };
    if (req.query.competition) filter.competition = req.query.competition;
    if (req.query.mat) filter.mat = req.query.mat;

    const sessions = await ScoringSession.find(filter)
      .populate({ path: 'fight', populate: { path: 'redAthlete blueAthlete winner', select: 'firstName lastName club photo' } })
      .populate('competition', 'name title mat')
      .sort({ status: -1, updatedAt: -1 })
      .limit(50);

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};

// Scoring settings
export const getRuleset = async (req, res) => {
  try {
    const { discipline } = req.params;
    const ruleset = getRulesetForDiscipline((discipline || 'NEWAZA').toUpperCase());
    res.json(ruleset);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};

export const getScoringSettings = async (req, res) => {
  try {
    const filter = { ...scope(req) };
    if (req.query.competition) filter.competition = req.query.competition;
    if (req.query.discipline) filter.discipline = req.query.discipline;

    const settings = await ScoringSettings.find(filter).sort({ createdAt: -1 });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};
