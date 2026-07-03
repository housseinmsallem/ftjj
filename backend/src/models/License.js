import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },

  // The person/entity this license belongs to
  ownerType: { type: String, enum: ['CLUB', 'ATHLETE', 'COACH', 'REFEREE', 'TECHNICIAN'], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },

  // Season year
  year: { type: Number, default: new Date().getFullYear() },

  // License number — unique federal identifier
  licenseNumber: { type: String, unique: true, sparse: true },

  // Status
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'REJECTED'], default: 'PENDING' },

  // Dates
  issuedAt: Date,
  expiresAt: Date,

  // Pricing
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'TND' },
  serviceType: { type: String, enum: [
    'INSCRIPTION_ANNUELLE',
    'LICENSE_COACH',
    'LICENSE_TECHNICIEN',
    'LICENSE_ATHLETE',
    'LICENSE_REFEREE',
    'STAGE_PASSAGE_GRADE',
    'RECYCLAGE_COACH',
    'RECYCLAGE_ARBITRE',
    'PASSAGE_GRADE_MARRON',
    'PASSAGE_GRADE_BLACK',
    'PASSAGE_GRADE_ARBITRE_1',
    'PASSAGE_GRADE_ARBITRE_2',
    'PASSAGE_GRADE_ARBITRE_3',
    'COACH_FEDERALE',
    'PARTICIPATION_COMPETITION',
    'PARTICIPATION_QUALIFICATIONS',
    'PARTICIPATION_FINALS',
    'ASSURANCE_COMPETITION_MALE',
    'ASSURANCE_COMPETITION_FEMALE',
    'OTHER'
  ], default: 'LICENSE_ATHLETE' },

  // Required documents
  idDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadAsset' },       // CIN / National ID card
  paymentReceipt: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadAsset' },    // Proof of payment
  additionalDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UploadAsset' }],

  // Metadata
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: Date,
  rejectionReason: String,
  notes: String
}, { timestamps: true });

licenseSchema.index({ ownerType: 1, ownerId: 1, year: 1 });

export default mongoose.model('License', licenseSchema);
