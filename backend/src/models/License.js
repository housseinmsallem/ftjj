import mongoose from 'mongoose';
const licenseSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  ownerType: { type: String, enum: ['CLUB','ATHLETE','COACH','REFEREE'], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  year: { type: Number, default: new Date().getFullYear() },
  status: { type: String, enum: ['PENDING','ACTIVE','EXPIRED','SUSPENDED'], default: 'PENDING' },
  issuedAt: Date,
  expiresAt: Date,
  amount: { type: Number, default: 0 }
}, { timestamps: true });
export default mongoose.model('License', licenseSchema);
