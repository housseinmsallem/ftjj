import mongoose from 'mongoose';

const priceEntrySchema = new mongoose.Schema({
  serviceType: { type: String, required: true },
  label: { type: String, required: true },
  labelAr: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'TND' },
  description: String,
  category: { type: String, enum: ['LICENSE', 'GRADE', 'COMPETITION', 'INSURANCE', 'TRAINING', 'OTHER'], default: 'OTHER' },
  isActive: { type: Boolean, default: true },
  requiredDocuments: [{
    label: String,
    documentType: String,
    required: { type: Boolean, default: true }
  }]
}, { _id: false });

const pricingSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  year: { type: Number, default: () => new Date().getFullYear() },
  prices: [priceEntrySchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Seed default pricing
pricingSchema.statics.seedDefaults = async function (federationId) {
  const existing = await this.findOne({ federation: federationId });
  if (existing) return existing;

  return this.create({
    federation: federationId,
    prices: [
      { serviceType: 'INSCRIPTION_ANNUELLE', label: 'Inscription Annuelle', amount: 120, category: 'LICENSE', requiredDocuments: [{ label: 'Pièce d\'identité (CIN)', documentType: 'id_card', required: true }] },
      { serviceType: 'LICENSE_COACH', label: 'License Coach', amount: 40, category: 'LICENSE', requiredDocuments: [{ label: 'Pièce d\'identité (CIN)', documentType: 'id_card', required: true }] },
      { serviceType: 'LICENSE_TECHNICIEN', label: 'License Technicien', amount: 20, category: 'LICENSE', requiredDocuments: [{ label: 'Pièce d\'identité (CIN)', documentType: 'id_card', required: true }] },
      { serviceType: 'LICENSE_ATHLETE', label: 'License Athlète', amount: 120, category: 'LICENSE', requiredDocuments: [{ label: 'Pièce d\'identité (CIN)', documentType: 'id_card', required: true }, { label: 'Certificat Médical', documentType: 'medical_certificate', required: true }] },
      { serviceType: 'LICENSE_REFEREE', label: 'License Arbitre', amount: 120, category: 'LICENSE', requiredDocuments: [{ label: 'Pièce d\'identité (CIN)', documentType: 'id_card', required: true }] },
      { serviceType: 'STAGE_PASSAGE_GRADE', label: 'Stage Passage de Grade', amount: 10, category: 'TRAINING' },
      { serviceType: 'RECYCLAGE_COACH', label: 'Recyclage Coach et Arbitres', amount: 10, category: 'TRAINING' },
      { serviceType: 'PASSAGE_GRADE_MARRON', label: 'Passage de Grade Marron', amount: 50, category: 'GRADE' },
      { serviceType: 'PASSAGE_GRADE_BLACK', label: 'Passage de Grade Black Belt ou +', amount: 100, category: 'GRADE' },
      { serviceType: 'PASSAGE_GRADE_ARBITRE_1', label: 'Passage de Grade Arbitre 1er degré', amount: 100, category: 'GRADE' },
      { serviceType: 'PASSAGE_GRADE_ARBITRE_2', label: 'Passage de Grade Arbitre 2ème degré', amount: 120, category: 'GRADE' },
      { serviceType: 'PASSAGE_GRADE_ARBITRE_3', label: 'Passage de Grade Arbitre 3ème degré', amount: 150, category: 'GRADE' },
      { serviceType: 'COACH_FEDERALE', label: 'Coach Fédéral', amount: 400, category: 'TRAINING' },
      { serviceType: 'PARTICIPATION_COMPETITION', label: 'Participation Compétition', amount: 10, category: 'COMPETITION' },
      { serviceType: 'PARTICIPATION_QUALIFICATIONS', label: 'Participation Qualifications', amount: 10, category: 'COMPETITION' },
      { serviceType: 'PARTICIPATION_FINALS', label: 'Participation Jeu Finals', amount: 10, category: 'COMPETITION' },
      { serviceType: 'ASSURANCE_COMPETITION_MALE', label: 'Assurance Compétition (Homme)', amount: 15, category: 'INSURANCE' },
      { serviceType: 'ASSURANCE_COMPETITION_FEMALE', label: 'Assurance Compétition (Femme)', amount: 5, category: 'INSURANCE' },
    ]
  });
};

export default mongoose.model('Pricing', pricingSchema);
