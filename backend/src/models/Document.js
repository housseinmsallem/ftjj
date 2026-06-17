import mongoose from 'mongoose';
const documentSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['LICENSE', 'MEDICAL_CERTIFICATE', 'AFFILIATION', 'REGULATION', 'ADMIN'], default: 'ADMIN' },
  ownerType: { type: String, enum: ['CLUB', 'ATHLETE', 'COACH', 'REFEREE', 'FEDERATION'], default: 'FEDERATION' },
  ownerId: mongoose.Schema.Types.ObjectId,
  fileUrl: String,
  status: { type: String, enum: ['PENDING', 'VALIDATED', 'REJECTED'], default: 'PENDING' }
}, { timestamps: true });
export default mongoose.model('Document', documentSchema);
