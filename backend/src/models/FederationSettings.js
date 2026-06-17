import mongoose from 'mongoose';
const federationSettingsSchema = new mongoose.Schema({
  name: { type: String, default: 'Fédération Tunisienne de Jiu-Jitsu' },
  acronym: { type: String, default: 'FTJJ' },
  season: { type: String, default: '2026' },
  contactEmail: { type: String, default: 'contact@ftjj.tn' },
  phone: String,
  address: String,
  bankAccount: String,
  licensePrices: { club: { type: Number, default: 250 }, athlete: { type: Number, default: 40 }, coach: { type: Number, default: 60 }, referee: { type: Number, default: 60 } },
  homepage: { heroTitle: String, heroSubtitle: String, youtubeLiveUrl: String, facebookUrl: String },
}, { timestamps: true });
export default mongoose.model('FederationSettings', federationSettingsSchema);
