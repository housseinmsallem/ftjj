import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  federationName: { type: String, default: 'Federation Tunisienne de Jiu-Jitsu' },
  shortName: { type: String, default: 'FTJJ' },
  logo: String,
  favicon: String,
  primaryColor: { type: String, default: '#d71920' },
  secondaryColor: { type: String, default: '#05070b' },
  accentColor: { type: String, default: '#f5c542' },
  defaultHeroImage: String,
  defaultAthleteImage: String,
  defaultClubLogo: String,
  slogan: String,
  footerText: String,
  contactEmail: String,
  phone: String,
  address: String,
  socialLinks: { type: Map, of: String, default: {} },
  sponsors: [{ name: String, logo: String, url: String, enabled: { type: Boolean, default: true } }],
  publicTheme: { type: String, default: 'federal' },
  competitionTheme: { type: String, default: 'tatami' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('PlatformSettings', platformSettingsSchema);
