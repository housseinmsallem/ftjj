import mongoose from 'mongoose';
const matchSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  competition: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true },
  mat: { type: String, default: 'Tatami 1' },
  round: String,
  category: String,
  redAthlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
  blueAthlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
  redScore: { type: Number, default: 0 },
  blueScore: { type: Number, default: 0 },
  redAdvantages: { type: Number, default: 0 },
  blueAdvantages: { type: Number, default: 0 },
  redPenalties: { type: Number, default: 0 },
  bluePenalties: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 300 },
  remainingSeconds: { type: Number, default: 300 },
  timerState: { type: String, enum: ['idle','running','paused','finished'], default: 'idle' },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
  status: { type: String, enum: ['scheduled','live','finished','cancelled'], default: 'scheduled' },
  startedAt: Date,
  finishedAt: Date,
  order: { type: Number, default: 0 }
}, { timestamps: true });
export default mongoose.model('MatchBracket', matchSchema);
