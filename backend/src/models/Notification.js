import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetRole: { type: String, enum: ['ALL','FEDERATION_ADMIN','CLUB_ADMIN','COACH','REFEREE','ATHLETE'], default: 'ALL' },
  status: { type: String, enum: ['draft','sent'], default: 'draft' },
  sentAt: Date
}, { timestamps: true });
export default mongoose.model('Notification', notificationSchema);
