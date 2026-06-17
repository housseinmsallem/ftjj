import mongoose from 'mongoose';
const paymentSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  payerType: { type: String, enum: ['CLUB', 'ATHLETE'], required: true },
  payerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'TND' },
  method: { type: String, enum: ['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'MANUAL', 'KONNECT', 'FLOUCI'], default: 'MANUAL' },
  purpose: { type: String, enum: ['CLUB_LICENSE', 'ATHLETE_LICENSE', 'COMPETITION_REGISTRATION'], required: true },
  status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
  receiptNumber: String
}, { timestamps: true });
export default mongoose.model('Payment', paymentSchema);
