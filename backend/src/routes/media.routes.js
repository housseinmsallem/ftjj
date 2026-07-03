import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import MediaAsset from '../models/MediaAsset.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';

const router = Router();
const uploadDir = path.join(process.cwd(), 'src', 'uploads', 'media');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({ destination: uploadDir, filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`) });
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const roles = ['SUPER_ADMIN','FEDERATION_ADMIN','MEDIA_MANAGER'];
function scope(req) { return req.user?.federation && req.user.role !== 'SUPER_ADMIN' ? { federation: req.user.federation } : {}; }
async function createAsset(req, file) {
  const asset = await MediaAsset.create({ ...scope(req), filename: file.filename, originalName: file.originalname, url: `/uploads/media/${file.filename}`, mimeType: file.mimetype, size: file.size, category: req.body.category || 'OTHER', public: req.body.public === 'true' || req.body.public === true, tags: String(req.body.tags || '').split(',').map((x) => x.trim()).filter(Boolean), uploadedBy: req.user._id });
  await audit({ actor: req.user._id, action: 'MEDIA_UPLOADED', entity: 'MediaAsset', entityId: asset._id });
  return asset;
}
router.get('/public', async (req, res) => {
  const query = { public: true, category: 'GALLERY' };
  res.json(await MediaAsset.find(query).sort({ createdAt: -1 }).limit(100));
});
router.get('/', protect, async (req, res) => {
  const query = { ...scope(req) };
  if (req.query.category) query.category = req.query.category;
  if (req.query.q) query.$text = { $search: req.query.q };
  res.json(await MediaAsset.find(query).sort({ createdAt: -1 }).limit(300));
});
router.post('/upload', protect, allowRoles(...roles), upload.single('file'), async (req, res) => res.status(201).json(await createAsset(req, req.file)));
router.post('/upload-multiple', protect, allowRoles(...roles), upload.array('files', 20), async (req, res) => res.status(201).json(await Promise.all((req.files || []).map((file) => createAsset(req, file)))));
router.patch('/:id', protect, allowRoles(...roles), async (req, res) => res.json(await MediaAsset.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, req.body, { new: true })));
router.delete('/:id', protect, allowRoles(...roles), async (req, res) => { const deleted = await MediaAsset.findOneAndDelete({ _id: req.params.id, ...scope(req) }); if (!deleted) return res.status(404).json({ message: 'Media introuvable' }); await audit({ actor: req.user._id, action: 'MEDIA_DELETED', entity: 'MediaAsset', entityId: deleted._id }); res.json({ message: 'Media supprime' }); });
export default router;
