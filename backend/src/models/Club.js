import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  name: { type: String, required: true, trim: true },
  governorate: String,
  address: String,
  president: String,
  email: String,
  phone: String,
  logo:{ type: String, required: false},
  affiliationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], default: 'PENDING' },
  licenseYear: { type: Number, default: new Date().getFullYear() },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  federalId: { type: String, unique: true, index: { sparse: true } },
  legalRepresentative: String,
  affiliationSeason: { type: String, default: () => String(new Date().getFullYear()) },
  affiliationDocumentsStatus: { type: String, enum: ['INCOMPLETE', 'PENDING_REVIEW', 'VALIDATED', 'REJECTED'], default: 'INCOMPLETE' },
  affiliationValidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  affiliationValidatedAt: Date,
  portalAccessCreatedAt: Date,
  portalAccessSentAt: Date,
  rejectionReason: String
}, { timestamps: true });

export default mongoose.model('Club', clubSchema);
