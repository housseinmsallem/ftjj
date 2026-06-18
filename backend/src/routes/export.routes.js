import { Router } from 'express';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Competition from '../models/Competition.js';
import Payment from '../models/Payment.js';
import License from '../models/License.js';

const router = Router();
const models = { clubs: Club, athletes: Athlete, competitions: Competition, payments: Payment };

function toCsv(rows) {
  if (!rows.length) return '';
  const flat = rows.map((r) => JSON.parse(JSON.stringify(r)));
  const keys = [...new Set(flat.flatMap(Object.keys))].filter((k) => !['__v'].includes(k));
  const esc = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  return [
    keys.join(','),
    ...flat.map((r) => keys.map((k) => esc(typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k])).join(','))
  ].join('\n');
}

function escapePdfText(s) {
  return String(s ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function buildSimplePdfFromLines(lines) {
  // Minimal, single-page PDF (no compression), with basic Helvetica text.
  // This is intentionally simple: plain lines drawn from top to bottom.
  // PDF structure adapted to be dependency-free.
  const cleanLines = lines.map((l) => escapePdfText(l));

  // Convert top-down lines into PDF text matrix.
  // Page size: A4 portrait (595.28 x 841.89 points)
  const pageW = 595.28;
  const pageH = 841.89;
  const left = 50;
  const top = 760;
  const lineHeight = 14;

  const textOps = cleanLines
    .slice(0, 60)
    .map((t, idx) => {
      const y = top - idx * lineHeight;
      return `1 0 0 1 ${left.toFixed(2)} ${y.toFixed(2)} Tm (${t}) Tj`;
    })
    .join(' ');

  const contentStream = `BT /F1 12 Tf ${textOps} ET`;
  const contentBytes = Buffer.from(contentStream, 'utf8');

  // PDF objects (1-based):
  // 1: catalog
  // 2: pages
  // 3: page
  // 4: font
  // 5: content stream
  const objects = [];

  const addObject = (str) => objects.push(str);

  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`);
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  addObject(`<< /Length ${contentBytes.length} >>\nstream\n${contentStream}\nendstream`);

  let pdf = '%PDF-1.4\n';
  const xref = [0];

  for (let i = 0; i < objects.length; i++) {
    xref.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < xref.length; i++) {
    pdf += `${String(xref[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

router.get('/:resource.csv', protect, allowRoles('FEDERATION_ADMIN'), async (req, res, next) => {
  try {
    const Model = models[req.params.resource];
    if (!Model) return res.status(404).json({ message: 'Export inconnu' });
    const rows = await Model.find({}).limit(5000).lean();
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`ftjj-${req.params.resource}.csv`);
    res.send(toCsv(rows));
  } catch (e) {
    next(e);
  }
});

// Export a single License as PDF
router.get('/licenses/:id/pdf', protect, allowRoles('FEDERATION_ADMIN'), async (req, res, next) => {
  try {
    const license = await License.findById(req.params.id).lean();
    if (!license) return res.status(404).json({ message: 'Licence introuvable' });

    const ownerLabel = `${license.ownerType || 'OWNER'}#${license.ownerId || ''}`;
    const year = license.year ?? '';

    const lines = [
      'FTJJ - Licence',
      '----------------',
      `Licence ID: ${license._id}`,
      `Owner: ${ownerLabel}`,
      `Year: ${year}`,
      `Status: ${license.status ?? ''}`,
      `Issued at: ${license.issuedAt ? new Date(license.issuedAt).toISOString().slice(0, 10) : ''}`,
      `Expires at: ${license.expiresAt ? new Date(license.expiresAt).toISOString().slice(0, 10) : ''}`,
      `Amount: ${license.amount ?? 0}`,
      '',
      '---',
      'Generated automatically (simple PDF export).'
    ];

    const pdfBuffer = buildSimplePdfFromLines(lines);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ftjj-licence-${license._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
});

export default router;

