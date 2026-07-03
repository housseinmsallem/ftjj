import { newazaRules } from './rulesets/newaza.rules.js';
import { fightingRules } from './rulesets/fighting.rules.js';
import { fullContactRules } from './rulesets/fullContact.rules.js';
import { duoRules } from './rulesets/duo.rules.js';

const RULESETS = {
  NEWAZA: newazaRules,
  FIGHTING: fightingRules,
  FULL_CONTACT: fullContactRules,
  DUO: duoRules
};

export function getRulesetForDiscipline(discipline) {
  return RULESETS[discipline] || newazaRules;
}

/**
 * Derives which side wins based on scoring state.
 * Priority: Disqualification > Submission > Forfeit > Points > Advantages > Penalties (fewer)
 */
export function deriveWinner(sessionState) {
  const red = sessionState.red || {};
  const blue = sessionState.blue || {};

  // Disqualification check
  if (red.disqualifications > 0 && blue.disqualifications === 0) {
    return { winnerSide: 'blue', winMethod: 'disqualification' };
  }
  if (blue.disqualifications > 0 && red.disqualifications === 0) {
    return { winnerSide: 'red', winMethod: 'disqualification' };
  }
  if (red.disqualifications > 0 && blue.disqualifications > 0) {
    return { winnerSide: 'draw', winMethod: 'disqualification' };
  }

  // If explicit winMethod is set (submission, forfeit), use it
  if (sessionState.winMethod && sessionState.winnerSide && sessionState.winMethod !== 'points') {
    return { winnerSide: sessionState.winnerSide, winMethod: sessionState.winMethod };
  }

  // Points-based decision
  if (red.score > blue.score) return { winnerSide: 'red', winMethod: 'points' };
  if (blue.score > red.score) return { winnerSide: 'blue', winMethod: 'points' };

  // Tie-breaking: advantages
  if (red.advantages > blue.advantages) return { winnerSide: 'red', winMethod: 'decision' };
  if (blue.advantages > red.advantages) return { winnerSide: 'blue', winMethod: 'decision' };

  // Tie-breaking: fewer penalties
  if (red.penalties < blue.penalties) return { winnerSide: 'red', winMethod: 'decision' };
  if (blue.penalties < red.penalties) return { winnerSide: 'blue', winMethod: 'decision' };

  return { winnerSide: 'draw', winMethod: 'draw' };
}

export function applyScoringAction(sessionDoc, action) {
  const state = sessionDoc.toObject ? sessionDoc.toObject() : JSON.parse(JSON.stringify(sessionDoc));
  const side = action.side;
  const type = action.type || action.actionType;
  const value = Number(action.value ?? 1);

  if (['red', 'blue'].includes(side)) {
    if (type === 'points') {
      state[side].score = Math.max(0, (state[side].score || 0) + value);
    }
    if (type === 'advantage') {
      state[side].advantages = Math.max(0, (state[side].advantages || 0) + value);
    }
    if (type === 'penalty') {
      state[side].penalties = Math.max(0, (state[side].penalties || 0) + value);
    }
    if (type === 'stalling') {
      state[side].stalling = Math.max(0, (state[side].stalling || 0) + value);
    }
    if (type === 'warning') {
      state[side].warnings = Math.max(0, (state[side].warnings || 0) + value);
      if (!state.warningHistory) state.warningHistory = [];
      for (let i = 0; i < value; i++) {
        state.warningHistory.push({
          side,
          reason: action.reason || 'Unsportsmanlike conduct',
          issuedAt: new Date(),
          issuedBy: action.issuedBy || null
        });
      }

      // 3 warnings = disqualification (configurable)
      const maxWarnings = action.maxWarnings || 3;
      if (state[side].warnings >= maxWarnings) {
        state[side].disqualifications = (state[side].disqualifications || 0) + 1;
      }
    }
    if (type === 'disqualification') {
      state[side].disqualifications = Math.max(0, (state[side].disqualifications || 0) + value);
    }
  }

  // Timer and status transitions
  if (type === 'start') {
    state.timerState = 'running';
    state.status = 'live';
    state.startedAt = new Date();
    state.pausedAt = null;
  }
  if (type === 'pause') {
    // Snapshot the remaining time at pause moment
    if (state.timerState === 'running' && state.startedAt) {
      const elapsed = (Date.now() - new Date(state.startedAt).getTime()) / 1000;
      state.remainingSeconds = Math.max(0, Math.round(state.durationSeconds - elapsed));
    }
    state.timerState = 'paused';
    state.status = 'paused';
    state.pausedAt = new Date();
  }
  if (type === 'resume') {
    // Backdate startedAt so elapsed time accounts for time before pause
    if (state.remainingSeconds !== undefined && state.durationSeconds) {
      const alreadyElapsed = (state.durationSeconds - state.remainingSeconds) * 1000;
      state.startedAt = new Date(Date.now() - alreadyElapsed);
    } else {
      state.startedAt = new Date();
    }
    state.timerState = 'running';
    state.status = 'live';
    state.pausedAt = null;
  }
  if (type === 'doctor_time') {
    if (state.timerState === 'running' && state.startedAt) {
      const elapsed = (Date.now() - new Date(state.startedAt).getTime()) / 1000;
      state.remainingSeconds = Math.max(0, Math.round(state.durationSeconds - elapsed));
    }
    state.timerState = 'doctor_time';
    state.pausedAt = new Date();
  }
  if (type === 'waiting_time') {
    if (state.timerState === 'running' && state.startedAt) {
      const elapsed = (Date.now() - new Date(state.startedAt).getTime()) / 1000;
      state.remainingSeconds = Math.max(0, Math.round(state.durationSeconds - elapsed));
    }
    state.timerState = 'waiting_time';
    state.pausedAt = new Date();
  }
  if (type === 'finish') {
    // Compute final remaining seconds
    if (state.timerState === 'running' && state.startedAt) {
      const elapsed = (Date.now() - new Date(state.startedAt).getTime()) / 1000;
      state.remainingSeconds = Math.max(0, Math.round(state.durationSeconds - elapsed));
    }
    state.timerState = 'finished';
    state.status = 'finished';
    state.startedAt = null;
    state.pausedAt = null;

    // Respect explicit winner info if provided
    if (action.winnerSide || action.winMethod) {
      state.winnerSide = action.winnerSide || state.winnerSide;
      state.winMethod = action.winMethod || state.winMethod || 'points';
    } else {
      // Derive winner from scores
      const derived = deriveWinner(state);
      state.winnerSide = derived.winnerSide;
      state.winMethod = derived.winMethod;
    }
  }

  return state;
}
