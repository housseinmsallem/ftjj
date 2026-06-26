import express from 'express';
import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Coach from '../models/Coach.js';
import Referee from '../models/Referee.js';
import Competition from '../models/Competition.js';
import Document from '../models/Document.js';
import Payment from '../models/Payment.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import multer from 'multer';
import path from 'path';
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

const resources = {
  clubs: { model: Club, uploadField: 'logo' },
  athletes: { model: Athlete, uploadField: 'photo' },
  coaches: { model: Coach, uploadField: 'photo' },
  referees: { model: Referee, uploadField: 'photo' },
  competitions: { model: Competition, uploadField: null },
  documents: { model: Document, uploadField: null },
  payments: { model: Payment, uploadField: null }
};

// --- Dynamic Route Generation ---
for (const [name, config] of Object.entries(resources)) {
  const { model: Model, uploadField } = config;

  // Middleware: always parse multipart when this resource expects a file.
  const parseUpload = (req, res, next) => {
    if (!uploadField) return next();

    // Request-level diagnostics
    console.log(`[upload] POST /${name}`);
    console.log('[upload] content-type:', req.headers['content-type']);
    console.log('[upload] content-length:', req.headers['content-length']);
    console.log('[upload] before multer req.body keys:', Object.keys(req.body || {}));

    const mw = upload.single(uploadField);
    mw(req, res, (err) => {
      if (err) {
        console.error('[upload] multer error:', err);
        return next(err);
      }
      console.log('[upload] after multer req.file:', req.file);
      console.log('[upload] after multer req.body:', req.body);
      return next();
    });
  };

  const handleFileUpload = (req, res, next) => {
    if (uploadField && req.file) {
      req.body[uploadField] = `/uploads/${req.file.filename}`;
    }
    // Coerce common scalar types coming from FormData (everything is string)
    for (const [k, v] of Object.entries(req.body || {})) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        if (v === 'true') req.body[k] = true;
        else if (v === 'false') req.body[k] = false;
        // numeric coercion for numeric-looking values
        else if (/^-?\d+(\.\d+)?$/.test(v)) {
          // keep IDs as strings by default; only coerce known numeric fields
          // (you can extend this list later)
          if (
            ['experienceYears', 'year', 'amount', 'weight', 'rankingPoints', 'maxParticipants', 'degree', 'jiujitsuBlackBeltDegree', 'newazaBlackBeltDegree'].includes(k)
          ) {
            req.body[k] = Number(v);
          }
        }
      }
    }
    next();
  };

  //GET ALL
  router.get(`/${name}`, async (req, res, next) => {
  try {
    const sort = req.query.sort || '-createdAt';
    const data = await Model.find().sort(sort).populate('club user events');
    res.json({ data });
  } catch (err) { 
    console.error(`❌ CRASH OCCURRED IN GET /${name} ROUTE!`);
    console.error(err);
    next(err); 
  }
  });
  // GET ONE
  router.get(`/${name}/:id`, async (req, res, next) => {
    try {
      const item = await Model.findById(req.params.id).populate('club user events');
      if (!item) return res.status(404).json({ message: 'Introuvable' });
      res.json({ data: item });
    } catch (err) { next(err); }
  });

  // CREATE (POST)
  router.post(
    `/${name}`, 
    parseUpload, 
    allowRoles('FEDERATION_ADMIN', 'CLUB_ADMIN'), 
    protect, 
    handleFileUpload,
    async (req, res, next) => {
      try {
        console.log(`--- POST /${name} ---`);
        console.log('final req.file:', req.file);
        console.log('final req.body:', req.body);
        console.log('final req.body types:', Object.fromEntries(Object.entries(req.body || {}).map(([k,v])=>[k, typeof v])));

        const item = await Model.create(req.body);
        console.log('created item (raw):', item?.toObject ? item.toObject() : item);
        res.status(201).json({ data: item });
      } catch (err) {
        console.error(`--- POST /${name} create() failed ---`);
        console.error('err.name:', err?.name);
        console.error('err.message:', err?.message);
        console.error('req.body at failure:', req.body);
        console.error('req.body types at failure:',
          Object.fromEntries(Object.entries(req.body || {}).map(([k,v]) => [k, typeof v]))
        );
        console.error('req.file at failure:', req.file);
        throw err;
      }
    }
  );

  // UPDATE (PUT)
  router.put(
    `/${name}/:id`, 
    parseUpload, 
    allowRoles('FEDERATION_ADMIN', 'CLUB_ADMIN'), 
    protect, 
    handleFileUpload,
    async (req, res, next) => {
      try {
        const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ data: item });
      } catch (err) { next(err); }
    }
  );

  // DELETE
  router.delete(`/${name}/:id`, protect, allowRoles('FEDERATION_ADMIN'), async (req, res, next) => {
    try {
      await Model.findByIdAndDelete(req.params.id);
      res.json({ message: 'Supprimé' });
    } catch (err) { next(err); }
  });
}

export default router;
