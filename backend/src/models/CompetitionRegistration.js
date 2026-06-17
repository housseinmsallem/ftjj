import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  status: String,
  comment: String,
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const competitionRegistrationSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', index: true },
  athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName: String,
  lastName: String,
  birthDate: Date,
  discipline: { type: String, enum: ['NEWAZA','FIGHTING','FULL_CONTACT','DUO'], default: 'NEWAZA' },
  belt: { type: String, enum: ['WHITE','BLUE','PURPLE','BROWN','BLACK'], default: 'WHITE' },
  grade: String,
  ageCategory: String,
  weightDeclared: Number,
  weightVerified: Number,
  weightCategory: String,
  gender: { type: String, enum: ['MALE','FEMALE','MIXED'] },
  licenseNumber: String,
  licenseStatus: { type: String, enum: ['PENDING','ACTIVE','EXPIRED','SUSPENDED'], default: 'PENDING' },
  documents: [{ name: String, url: String, type: String }],
  status: { type: String, enum: ['draft','submitted','pending_validation','approved','rejected','modified'], default: 'submitted' },
  federationDecision: String,
  federationComment: String,
  clubComment: String,
  validationHistory: [historySchema]
}, { timestamps: true });

competitionRegistrationSchema.index({ competitionId: 1, clubId: 1, athleteId: 1, discipline: 1 });
export default mongoose.model('CompetitionRegistration', competitionRegistrationSchema);
