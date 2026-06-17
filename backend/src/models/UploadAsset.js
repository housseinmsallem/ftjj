import mongoose from 'mongoose';
const uploadAssetSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['license','medical_certificate','affiliation','competition','content','other'], default: 'other' },
  ownerType: { type: String, enum: ['Club','Athlete','Coach','Referee','Competition','Federation','Other'], default: 'Other' },
  owner: { type: mongoose.Schema.Types.ObjectId, refPath: 'ownerType' },
  provider: String,
  url: String,
  key: String,
  mimeType: String,
  size: Number,
  originalName: String,
  status: { type: String, enum: ['pending','approved','rejected','expired'], default: 'pending' },
  expiresAt: Date,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: Date,
  rejectionReason: String
}, { timestamps: true });
export default mongoose.model('UploadAsset', uploadAssetSchema);
