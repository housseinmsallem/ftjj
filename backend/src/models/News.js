import mongoose from 'mongoose';
import slugify from 'slugify';

const newsSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  title: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  summary: String,
  content: String,
  mainImage: String,
  gallery: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  tags: [String],
  status: { type: String, enum: ['draft','published','archived'], default: 'draft' },
  featuredOnHome: { type: Boolean, default: false },
  publishedAt: Date,
  seoTitle: String,
  seoDescription: String
}, { timestamps: true });

newsSchema.pre('validate', function(next) {
  if (!this.slug && this.title) this.slug = slugify(this.title, { lower: true, strict: true });
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  next();
});

export default mongoose.model('News', newsSchema);
