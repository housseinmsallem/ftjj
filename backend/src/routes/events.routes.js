import { Router } from 'express';
import Event from '../models/Event.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';
const router = Router();
const roles = ['SUPER_ADMIN','FEDERATION_ADMIN','MEDIA_MANAGER'];
function scope(req) { return req.user?.federation && req.user.role !== 'SUPER_ADMIN' ? { federation: req.user.federation } : {}; }
router.get('/', async (req, res) => { const q = req.user ? scope(req) : { status: 'published' }; if (req.query.type) q.type = req.query.type; res.json(await Event.find(q).sort({ startDate: -1 })); });
router.get('/:slug', async (req, res) => { const event = await Event.findOne({ slug: req.params.slug }); if (!event) return res.status(404).json({ message: 'Evenement introuvable' }); res.json(event); });
router.post('/', protect, allowRoles(...roles), async (req, res) => { const doc = await Event.create({ ...req.body, ...scope(req), createdBy: req.user._id, updatedBy: req.user._id }); await audit({ actor: req.user._id, action: 'EVENT_CREATED', entity: 'Event', entityId: doc._id }); res.status(201).json(doc); });
router.patch('/:id', protect, allowRoles(...roles), async (req, res) => { const doc = await Event.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { ...req.body, updatedBy: req.user._id }, { new: true, runValidators: true }); res.json(doc); });
router.delete('/:id', protect, allowRoles(...roles), async (req, res) => { await Event.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { status: 'archived', updatedBy: req.user._id }); res.json({ message: 'Evenement archive' }); });
router.patch('/:id/publish', protect, allowRoles(...roles), async (req, res) => res.json(await Event.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { status: 'published', updatedBy: req.user._id }, { new: true })));
router.patch('/:id/feature', protect, allowRoles(...roles), async (req, res) => res.json(await Event.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { featuredOnHome: req.body.featuredOnHome ?? true, updatedBy: req.user._id }, { new: true })));
export default router;
