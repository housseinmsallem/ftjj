import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import UploadAsset from '../models/UploadAsset.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { storeFile, uploadPolicy, deleteStoredFile } from '../services/storage.service.js';
import { audit } from '../utils/audit.js';

const router = Router();
const uploadDir = path.join(process.cwd(), 'src', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: uploadPolicy.maxSizeBytes }, fileFilter: (req, file, cb) => uploadPolicy.allowedMimeTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Type fichier non autorise')) });

router.get('/policy', protect, (req, res) => res.json(uploadPolicy));
router.get('/', protect, async (req, res) => res.json(await UploadAsset.find().populate('uploadedBy validatedBy').sort('-createdAt').limit(200)));
router.post('/', protect, upload.single('file'), async (req, res) => {
  const meta = await storeFile(req.file, req.body.category || 'documents');
  const asset = await UploadAsset.create({ title: req.body.title || meta.originalName, category: req.body.category, ownerType: req.body.ownerType, owner: req.body.owner || undefined, expiresAt: req.body.expiresAt || undefined, uploadedBy: req.user._id, ...meta });
  await audit({ actor: req.user._id, action: 'UPLOAD_CREATED', entity: 'UploadAsset', entityId: asset._id, meta: { title: asset.title, provider: asset.provider } });
  res.status(201).json(asset);
});
router.patch('/:id/validate', protect, allowRoles('FEDERATION_ADMIN'), async (req, res) => {
  const asset = await UploadAsset.findByIdAndUpdate(req.params.id, { status: req.body.status || 'approved', rejectionReason: req.body.rejectionReason, validatedBy: req.user._id, validatedAt: new Date() }, { new: true });
  await audit({ actor: req.user._id, action: 'UPLOAD_VALIDATED', entity: 'UploadAsset', entityId: asset._id, meta: { status: asset.status } });
  res.json(asset);
});
router.delete('/:id', protect, allowRoles('FEDERATION_ADMIN'), async (req, res) => {
  const asset = await UploadAsset.findById(req.params.id);
  if (!asset) return res.status(404).json({ message: 'Document introuvable' });
  await deleteStoredFile(asset);
  await asset.deleteOne();
  await audit({ actor: req.user._id, action: 'UPLOAD_DELETED', entity: 'UploadAsset', entityId: asset._id });
  res.json({ message: 'Document supprime' });
});
export default router;
