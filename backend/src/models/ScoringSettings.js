import mongoose from 'mongoose';
const scoringSettingsSchema = new mongoose.Schema({ federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true }, competition: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition' }, discipline: String, rulesetName: String, durationSeconds: { type: Number, default: 300 }, points: { type: Map, of: Number, default: {} }, penalties: { type: Map, of: Number, default: {} }, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
export default mongoose.model('ScoringSettings', scoringSettingsSchema);
