import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', index: true },
  name: { type: String, required: true },
  discipline: String,
  gender: String,
  ageCategory: String,
  weightCategory: String,
  beltGroup: String,
  belts: [String],
  athletes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }],
  registrations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionRegistration' }],
  status: { type: String, enum: ['draft','generated','needs_review','locked','published'], default: 'generated' },
  warnings: [String],
  order: Number,
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: Date
}, { timestamps: true });

categorySchema.index({ competitionId: 1, name: 1 }, { unique: true });
export default mongoose.model('Category', categorySchema);
