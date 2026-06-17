import mongoose from 'mongoose';

const federationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  logo: String,
  primaryColor: { type: String, default: '#d71920' },
  secondaryColor: { type: String, default: '#05070b' },
  domain: String,
  plan: { type: String, enum: ['BASIC','PRO','ELITE'], default: 'BASIC' },
  status: { type: String, enum: ['ACTIVE','SUSPENDED','TRIAL'], default: 'ACTIVE' },
  billing: {
    annualPrice: { type: Number, default: 1200 },
    currency: { type: String, default: 'TND' },
    renewalDate: Date
  },
  limits: {
    clubs: { type: Number, default: 200 },
    athletes: { type: Number, default: 10000 },
    storageGb: { type: Number, default: 20 },
    smsPerYear: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model('Federation', federationSchema);
