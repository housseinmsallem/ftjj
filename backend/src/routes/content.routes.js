import { Router } from 'express';
import ContentBlock from '../models/ContentBlock.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';

const router = Router();
const adminOnly = [protect, allowRoles('FEDERATION_ADMIN')];

router.get('/public/slider', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 8), 20);
  const items = await ContentBlock.find({ status: 'PUBLISHED', displayOnHome: true })
    .sort({ displayOrder: 1, startDate: 1, createdAt: -1 })
    .limit(limit);
  res.json(items);
});

router.get('/', protect, async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.type) query.type = req.query.type;
  if (req.query.search) query.$text = { $search: req.query.search };
  const items = await ContentBlock.find(query).populate('createdBy', 'name email').sort({ displayOrder: 1, createdAt: -1 });
  res.json(items);
});

router.get('/:id', protect, async (req, res) => {
  const item = await ContentBlock.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Contenu introuvable' });
  res.json(item);
});

router.post('/', ...adminOnly, async (req, res) => {
  const item = await ContentBlock.create({ ...req.body, createdBy: req.user?._id });
  res.status(201).json(item);
});

router.put('/:id', ...adminOnly, async (req, res) => {
  const item = await ContentBlock.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: 'Contenu introuvable' });
  res.json(item);
});

router.patch('/:id/publish', ...adminOnly, async (req, res) => {
  const item = await ContentBlock.findByIdAndUpdate(req.params.id, { status: 'PUBLISHED' }, { new: true });
  if (!item) return res.status(404).json({ message: 'Contenu introuvable' });
  res.json(item);
});

router.patch('/:id/archive', ...adminOnly, async (req, res) => {
  const item = await ContentBlock.findByIdAndUpdate(req.params.id, { status: 'ARCHIVED' }, { new: true });
  if (!item) return res.status(404).json({ message: 'Contenu introuvable' });
  res.json(item);
});

router.delete('/:id', ...adminOnly, async (req, res) => {
  const item = await ContentBlock.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Contenu introuvable' });
  res.json({ message: 'Contenu supprimé avec succès' });
});

export default router;
