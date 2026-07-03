import mongoose from 'mongoose';

const technicianSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  birthDate: { type: Date, required: true },
  email: String,
  phone: String,
  photo: { type: String, required: false },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  specialty: { type: String, enum: ['BJJ', 'NE_WAZA', 'MMA', 'JU_JITSU', 'SELF_DEFENSE', 'OTHER'], default: 'OTHER' },
  licenseNumber: String,
  licenseStatus: { type: String, enum: ['PENDING', 'ACTIVE', 'EXPIRED'], default: 'PENDING' },
  certifications: [String],
  experienceYears: Number,
  bio: String
}, { timestamps: true });

export default mongoose.model('Technician', technicianSchema);
