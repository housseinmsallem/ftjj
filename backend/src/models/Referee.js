import mongoose from 'mongoose';
const refereeSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  licenseNumber: String,
  level: { type: String, enum: ['REGIONAL', 'NATIONAL', 'INTERNATIONAL'], default: 'REGIONAL' },
  certifications: [String],
  availability: { type: Boolean, default: true },
  bio: String,
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Competition' }]
}, { timestamps: true });
export default mongoose.model('Referee', refereeSchema);
