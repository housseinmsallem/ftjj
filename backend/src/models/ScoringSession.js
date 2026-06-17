import mongoose from 'mongoose';
const scoringSessionSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  fight: { type: mongoose.Schema.Types.ObjectId, ref: 'Fight', index: true },
  competition: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition' },
  discipline: { type: String, default: 'NEWAZA' },
  red: { score: { type: Number, default: 0 }, advantages: { type: Number, default: 0 }, penalties: { type: Number, default: 0 }, stalling: { type: Number, default: 0 } },
  blue: { score: { type: Number, default: 0 }, advantages: { type: Number, default: 0 }, penalties: { type: Number, default: 0 }, stalling: { type: Number, default: 0 } },
  durationSeconds: { type: Number, default: 300 },
  remainingSeconds: { type: Number, default: 300 },
  timerState: { type: String, enum: ['idle','running','paused','doctor_time','waiting_time','finished'], default: 'idle' },
  status: { type: String, enum: ['waiting','live','paused','finished','validated'], default: 'waiting' },
  winnerSide: { type: String, enum: ['red','blue','draw', null], default: null },
  winMethod: String,
  controlledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: Date
}, { timestamps: true });
export default mongoose.model('ScoringSession', scoringSessionSchema);
