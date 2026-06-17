import { Router } from 'express';
import FederationSettings from '../models/FederationSettings.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';
const router = Router();
router.get('/', protect, allowRoles('FEDERATION_ADMIN'), async (req, res, next) => {
    try {
        res.json(await FederationSettings.findOne() || await FederationSettings.create({}));
    } catch (e) {
        next(e);
    }
});
router.put('/', protect, allowRoles('FEDERATION_ADMIN'), async (req, res, next) => {
    try {
        const doc = await FederationSettings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        await audit({ actor: req.user._id, action: 'SETTINGS_UPDATE', entity: 'FederationSettings', entityId: doc._id });
        res.json(doc);
    } catch (e) { next(e); }
});
export default router;
