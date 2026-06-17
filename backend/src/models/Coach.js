import mongoose from 'mongoose';
const coachSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  licenseNumber: String,
  certifications: [String],
  specialties: [String],
  experienceYears: Number,
  bio: String,
  licenseStatus: { type: String, enum: ['PENDING', 'ACTIVE', 'EXPIRED'], default: 'PENDING' }
}, { timestamps: true });
export default mongoose.model('Coach', coachSchema);
