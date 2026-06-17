import mongoose from 'mongoose';
const auditLogSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entity: String,
  entityId: mongoose.Schema.Types.ObjectId,
  metadata: Object
}, { timestamps: true });
export default mongoose.model('AuditLog', auditLogSchema);
