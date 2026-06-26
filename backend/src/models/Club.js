import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  name: { type: String, required: true, trim: true },
  governorate: String,
  address: String,
  president: String,
  email: String,
  phone: String,
  logo:{ type: String, required: false},
  affiliationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], default: 'PENDING' },
  licenseYear: { type: Number, default: new Date().getFullYear() },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }]
}, { timestamps: true });

export default mongoose.model('Club', clubSchema);
