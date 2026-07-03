import mongoose from 'mongoose';

const importErrorSchema = new mongoose.Schema({
  row: { type: Number, required: true },
  message: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed
}, { _id: false });

const importBatchSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entityType: { type: String, enum: ['ATHLETE', 'COACH', 'REFEREE'], default: 'ATHLETE' },
  sourceFile: String,
  totalRows: { type: Number, default: 0 },
  inserted: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  rejected: { type: Number, default: 0 },
  rowErrors: [importErrorSchema],
  status: { type: String, enum: ['PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED'], default: 'PROCESSING' }
}, { timestamps: true });

export default mongoose.model('ImportBatch', importBatchSchema);
