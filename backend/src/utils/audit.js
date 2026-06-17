import AuditLog from '../models/AuditLog.js';
export const audit = async ({ actor, action, entity, entityId, metadata = {}, meta = {} }) => {
  try { await AuditLog.create({ actor, action, entity, entityId, metadata: { ...metadata, ...meta } }); } catch (e) { console.warn('Audit failed', e.message); }
};
