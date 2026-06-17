export function applyScoringAction(sessionDoc, action) {
  const state = sessionDoc.toObject ? sessionDoc.toObject() : JSON.parse(JSON.stringify(sessionDoc));
  const side = action.side;
  const type = action.type || action.actionType;
  const value = Number(action.value ?? 1);
  if (['red','blue'].includes(side)) {
    if (type === 'points') state[side].score = Math.max(0, (state[side].score || 0) + value);
    if (type === 'advantage') state[side].advantages = Math.max(0, (state[side].advantages || 0) + value);
    if (type === 'penalty') state[side].penalties = Math.max(0, (state[side].penalties || 0) + value);
    if (type === 'stalling') state[side].stalling = Math.max(0, (state[side].stalling || 0) + value);
  }
  if (type === 'start') { state.timerState = 'running'; state.status = 'live'; }
  if (type === 'pause') { state.timerState = 'paused'; state.status = 'paused'; }
  if (type === 'resume') { state.timerState = 'running'; state.status = 'live'; }
  if (type === 'doctor_time') state.timerState = 'doctor_time';
  if (type === 'waiting_time') state.timerState = 'waiting_time';
  if (type === 'finish') { state.timerState = 'finished'; state.status = 'finished'; state.winnerSide = action.winnerSide || state.winnerSide; state.winMethod = action.winMethod || state.winMethod || 'points'; }
  return state;
}
