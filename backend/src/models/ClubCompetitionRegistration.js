import mongoose from 'mongoose';

const clubCompetitionRegistrationSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true, index: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  athletes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionRegistration' }],
  status: { type: String, enum: ['draft','submitted','pending_validation','approved','rejected','locked'], default: 'draft' },
  submittedAt: Date,
  validatedAt: Date,
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: String
}, { timestamps: true });

clubCompetitionRegistrationSchema.index({ competitionId: 1, clubId: 1 }, { unique: true });
export default mongoose.model('ClubCompetitionRegistration', clubCompetitionRegistrationSchema);
