import { Router } from 'express';
import News from '../models/News.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
const router = Router();
const roles = ['SUPER_ADMIN','FEDERATION_ADMIN','MEDIA_MANAGER'];
function scope(req) { return req.user?.federation && req.user.role !== 'SUPER_ADMIN' ? { federation: req.user.federation } : {}; }
router.get('/', async (req, res) => { const q = req.user ? scope(req) : { status: 'published' }; res.json(await News.find(q).sort({ publishedAt: -1, createdAt: -1 })); });
router.get('/:slug', async (req, res) => { const doc = await News.findOne({ slug: req.params.slug }); if (!doc) return res.status(404).json({ message: 'Actualite introuvable' }); res.json(doc); });
router.post('/', protect, allowRoles(...roles), async (req, res) => res.status(201).json(await News.create({ ...req.body, ...scope(req), author: req.user._id })));
router.patch('/:id', protect, allowRoles(...roles), async (req, res) => res.json(await News.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, req.body, { new: true, runValidators: true })));
router.delete('/:id', protect, allowRoles(...roles), async (req, res) => { await News.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { status: 'archived' }); res.json({ message: 'Actualite archivee' }); });
router.patch('/:id/publish', protect, allowRoles(...roles), async (req, res) => res.json(await News.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { status: 'published', publishedAt: new Date() }, { new: true })));
export default router;
