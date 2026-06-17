import mongoose from 'mongoose';

const contentBlockSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true },
  type: { type: String, enum: ['EVENT', 'STAGE', 'NEWS', 'ANNOUNCEMENT', 'GRADE_PASSAGE', 'CHAMPIONSHIP'], default: 'EVENT' },
  description: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  ctaLabel: { type: String, default: 'Voir plus' },
  ctaUrl: { type: String, default: '/competitions' },
  startDate: Date,
  endDate: Date,
  location: String,
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
  featured: { type: Boolean, default: true },
  displayOnHome: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  animation: { type: String, enum: ['FADE', 'SLIDE', 'ZOOM'], default: 'SLIDE' },
  tags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

contentBlockSchema.index({ title: 'text', subtitle: 'text', description: 'text', tags: 'text' });
contentBlockSchema.index({ status: 1, displayOnHome: 1, displayOrder: 1 });

export default mongoose.model('ContentBlock', contentBlockSchema);
