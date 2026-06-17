import mongoose from 'mongoose';

const homePageSettingsSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  heroTitle: { type: String, default: 'Federation Tunisienne de Jiu-Jitsu' },
  heroSubtitle: { type: String, default: 'Competitions, clubs, athletes et resultats officiels' },
  introduction: String,
  heroImage: String,
  heroVideo: String,
  primaryButtonText: { type: String, default: 'Voir les competitions' },
  primaryButtonLink: { type: String, default: '/competitions' },
  secondaryButtonText: { type: String, default: 'Live scoring' },
  secondaryButtonLink: { type: String, default: '/live' },
  featuredEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  featuredCompetitions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Competition' }],
  featuredAthletes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }],
  featuredClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
  sections: [{ key: String, title: String, enabled: { type: Boolean, default: true }, order: Number, content: mongoose.Schema.Types.Mixed }],
  latestNewsEnabled: { type: Boolean, default: true },
  sponsorsEnabled: { type: Boolean, default: true },
  galleryEnabled: { type: Boolean, default: true },
  customSections: [{ title: String, body: String, image: String, enabled: { type: Boolean, default: true }, order: Number }],
  isPublished: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('HomePageSettings', homePageSettingsSchema);
