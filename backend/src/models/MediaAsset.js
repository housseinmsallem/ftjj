import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  filename: String,
  originalName: String,
  url: { type: String, required: true },
  mimeType: String,
  size: Number,
  width: Number,
  height: Number,
  category: { type: String, enum: ['LOGO','POSTER','ATHLETE_PHOTO','COACH_PHOTO','REFEREE_PHOTO','CLUB_PHOTO','HERO','SPONSOR','DOCUMENT','GALLERY','SCORING','OTHER'], default: 'OTHER' },
  public: { type: Boolean, default: false },
  tags: [String],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usedIn: [{ entityType: String, entityId: mongoose.Schema.Types.ObjectId, field: String }]
}, { timestamps: true });

mediaAssetSchema.index({ originalName: 'text', filename: 'text', tags: 'text', category: 'text' });
export default mongoose.model('MediaAsset', mediaAssetSchema);
