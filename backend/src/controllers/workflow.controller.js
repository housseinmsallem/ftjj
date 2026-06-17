import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Document from '../models/Document.js';
import Payment from '../models/Payment.js';
import License from '../models/License.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

function notFound(res, entity) {
  return res.status(404).json({ message: `${entity} introuvable` });
}

async function log(req, action, entity, entityId, metadata = {}) {
  if (!entityId) return;
  await AuditLog.create({ actor: req.user?._id, action, entity, entityId, metadata });
}

export async function approveClub(req, res) {
  const club = await Club.findByIdAndUpdate(req.params.id, { affiliationStatus: 'APPROVED' }, { new: true });
  if (!club) return notFound(res, 'Club');
  await User.updateMany({ club: club._id, role: 'CLUB_ADMIN' }, { isActive: true });
  await log(req, 'APPROVE_CLUB', 'Club', club._id);
  res.json(club);
}

export async function suspendClub(req, res) {
  const club = await Club.findByIdAndUpdate(req.params.id, { affiliationStatus: 'SUSPENDED' }, { new: true });
  if (!club) return notFound(res, 'Club');
  await User.updateMany({ club: club._id, role: 'CLUB_ADMIN' }, { isActive: false });
  await log(req, 'SUSPEND_CLUB', 'Club', club._id, { reason: req.body?.reason });
  res.json(club);
}

export async function validateDocument(req, res) {
  const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'VALIDATED' }, { new: true });
  if (!doc) return notFound(res, 'Document');
  await log(req, 'VALIDATE_DOCUMENT', 'Document', doc._id);
  res.json(doc);
}

export async function rejectDocument(req, res) {
  const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'REJECTED', rejectionReason: req.body?.reason }, { new: true });
  if (!doc) return notFound(res, 'Document');
  await log(req, 'REJECT_DOCUMENT', 'Document', doc._id, { reason: req.body?.reason });
  res.json(doc);
}

export async function issueLicense(req, res) {
  if (!req.body?.ownerType || !req.body?.ownerId) return res.status(400).json({ message: 'ownerType et ownerId requis' });
  const license = await License.create({ ...req.body, status: 'ACTIVE', issuedAt: new Date(), expiresAt: req.body.expiresAt });
  if (req.body.ownerType === 'ATHLETE') await Athlete.findByIdAndUpdate(req.body.ownerId, { licenseStatus: 'ACTIVE' });
  await log(req, 'ISSUE_LICENSE', 'License', license._id, req.body);
  res.status(201).json(license);
}

export async function markPaymentPaid(req, res) {
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status: 'PAID', paidAt: new Date(), receiptNumber: req.body?.receiptNumber || `FTJJ-${Date.now()}` },
    { new: true }
  );
  if (!payment) return notFound(res, 'Paiement');
  await log(req, 'MARK_PAYMENT_PAID', 'Payment', payment._id);
  res.json(payment);
}

export async function recalculateRankings(req, res) {
  const athletes = await Athlete.find().sort({ rankingPoints: -1, updatedAt: -1 }).populate('club');
  await log(req, 'RECALCULATE_RANKINGS', 'Athlete', 'ranking', { total: athletes.length });
  res.json(athletes.map((a, index) => ({ rank: index + 1, athlete: a })));
}
