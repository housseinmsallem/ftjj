import mongoose from 'mongoose';
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, tokenHash: { type: String, required: true }, expiresAt: { type: Date, required: true }, usedAt: Date }, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('EmailVerificationToken', schema);
