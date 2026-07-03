import mongoose from 'mongoose';

const warningSchema = new mongoose.Schema({
  side: { type: String, enum: ['red', 'blue'], required: true },
  reason: { type: String, default: 'Unsportsmanlike conduct' },
  issuedAt: { type: Date, default: Date.now },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

const scoringSessionSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  fight: { type: mongoose.Schema.Types.ObjectId, ref: 'Fight', index: true },
  competition: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition' },
  mat: { type: String, default: 'Tatami 1' },
  round: { type: String, default: '' },
  category: { type: String, default: '' },
  discipline: { type: String, enum: ['NEWAZA', 'FIGHTING', 'FULL_CONTACT', 'DUO'], default: 'NEWAZA' },
  red: {
    score: { type: Number, default: 0 },
    advantages: { type: Number, default: 0 },
    penalties: { type: Number, default: 0 },
    stalling: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    disqualifications: { type: Number, default: 0 }
  },
  blue: {
    score: { type: Number, default: 0 },
    advantages: { type: Number, default: 0 },
    penalties: { type: Number, default: 0 },
    stalling: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    disqualifications: { type: Number, default: 0 }
  },
  durationSeconds: { type: Number, default: 300 },
  remainingSeconds: { type: Number, default: 300 },
  startedAt: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
  timerState: { type: String, enum: ['idle', 'running', 'paused', 'doctor_time', 'waiting_time', 'finished'], default: 'idle' },
  status: { type: String, enum: ['waiting', 'live', 'paused', 'finished', 'validated'], default: 'waiting' },
  winnerSide: { type: String, enum: ['red', 'blue', 'draw', null], default: null },
  winMethod: { type: String, enum: ['points', 'submission', 'decision', 'forfeit', 'disqualification', 'draw', null], default: null },
  warningHistory: [warningSchema],
  controlledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      // Compute live remaining seconds based on timestamps
      if (ret.timerState === 'running' && ret.startedAt) {
        const elapsed = (Date.now() - new Date(ret.startedAt).getTime()) / 1000;
        ret.remainingSeconds = Math.max(0, Math.round(ret.durationSeconds - elapsed));
        // If timer naturally expired, reflect that
        if (ret.remainingSeconds <= 0) {
          ret.remainingSeconds = 0;
        }
      }
      // For paused / doctor_time / waiting_time, remainingSeconds is frozen from DB
      // For idle / finished, remainingSeconds is final
      return ret;
    }
  },
  toObject: {
    transform(doc, ret) {
      if (ret.timerState === 'running' && ret.startedAt) {
        const elapsed = (Date.now() - new Date(ret.startedAt).getTime()) / 1000;
        ret.remainingSeconds = Math.max(0, Math.round(ret.durationSeconds - elapsed));
        if (ret.remainingSeconds <= 0) {
          ret.remainingSeconds = 0;
        }
      }
      return ret;
    }
  }
});

scoringSessionSchema.index({ fight: 1, competition: 1 });
scoringSessionSchema.index({ status: 1 });
scoringSessionSchema.index({ mat: 1, status: 1 });

export default mongoose.model('ScoringSession', scoringSessionSchema);
