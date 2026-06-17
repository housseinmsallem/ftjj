import mongoose from 'mongoose';
import slugify from 'slugify';

const eventSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  type: { type: String, enum: ['STAGE','SEMINAR','COMPETITION','GRADE_PASSAGE','REFEREE_TRAINING','GENERAL_ASSEMBLY','FEDERAL_EVENT','CLUB_EVENT','OTHER'], default: 'FEDERAL_EVENT' },
  shortDescription: String,
  fullDescription: String,
  startDate: Date,
  endDate: Date,
  time: String,
  location: String,
  address: String,
  city: String,
  governorate: String,
  country: { type: String, default: 'Tunisie' },
  mainPoster: String,
  gallery: [String],
  video: String,
  organizer: String,
  relatedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
  registrationLink: String,
  registrationEnabled: { type: Boolean, default: false },
  maxParticipants: Number,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }],
  documents: [String],
  status: { type: String, enum: ['draft','published','archived'], default: 'draft' },
  featuredOnHome: { type: Boolean, default: false },
  tags: [String],
  seoTitle: String,
  seoDescription: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

eventSchema.pre('validate', function(next) {
  if (!this.slug && this.title) this.slug = slugify(this.title, { lower: true, strict: true });
  next();
});

export default mongoose.model('Event', eventSchema);
