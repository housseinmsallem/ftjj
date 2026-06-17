import { Router } from 'express';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Competition from '../models/Competition.js';
import Payment from '../models/Payment.js';

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

router.get('/:resource.csv', protect, allowRoles('FEDERATION_ADMIN'), async (req, res, next) => {
  try {
    const Model = models[req.params.resource];
    if (!Model) return res.status(404).json({ message: 'Export inconnu' });
    const rows = await Model.find({}).limit(5000).lean();
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`ftjj-${req.params.resource}.csv`);
    res.send(toCsv(rows));
  } catch (e) { next(e); }
});

export default router;
