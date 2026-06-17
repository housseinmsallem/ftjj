import mongoose from 'mongoose';
const scoringActionLogSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  fightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fight', index: true },
  scoringSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScoringSession', index: true },
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  side: { type: String, enum: ['red','blue','neutral'], default: 'neutral' },
  actionType: String,
  value: mongoose.Schema.Types.Mixed,
  remainingSeconds: Number,
  previousState: mongoose.Schema.Types.Mixed,
  newState: mongoose.Schema.Types.Mixed,
  comment: String
}, { timestamps: true });
export default mongoose.model('ScoringActionLog', scoringActionLogSchema);
