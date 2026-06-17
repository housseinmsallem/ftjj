import mongoose from 'mongoose';
const fightSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  competition: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition' },
  mat: { type: String, default: 'Tatami 1' },
  category: String,
  redAthlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
  blueAthlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
  redScore: { type: Number, default: 0 },
  blueScore: { type: Number, default: 0 },
  timerSeconds: { type: Number, default: 300 },
  status: { type: String, enum: ['SCHEDULED','LIVE','PAUSED','FINISHED'], default: 'SCHEDULED' },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }
}, { timestamps: true });
export default mongoose.model('Fight', fightSchema);
