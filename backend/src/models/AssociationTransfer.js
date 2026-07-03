import mongoose from 'mongoose';

const associationTransferSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  athlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true, index: true },
  fromClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  toClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  reason: { type: String, required: true, trim: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: Date,
  rejectionReason: String
}, { timestamps: true });

// Prevent duplicate pending transfers for the same athlete
associationTransferSchema.index(
  { athlete: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

export default mongoose.model('AssociationTransfer', associationTransferSchema);
