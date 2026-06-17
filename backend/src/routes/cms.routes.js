import { Router } from 'express';
import PlatformSettings from '../models/PlatformSettings.js';
import HomePageSettings from '../models/HomePageSettings.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';

const router = Router();
const cmsRoles = ['SUPER_ADMIN','FEDERATION_ADMIN','MEDIA_MANAGER'];
function scope(req) { return req.user?.federation && req.user.role !== 'SUPER_ADMIN' ? { federation: req.user.federation } : {}; }

router.get('/homepage', async (req, res) => {
  const doc = await HomePageSettings.findOne(req.user ? scope(req) : {}).populate('featuredCompetitions featuredAthletes featuredClubs');
  res.json(doc || await HomePageSettings.create({}));
});
router.patch('/homepage', protect, allowRoles(...cmsRoles), async (req, res) => {
  // Prevent client-provided _id / timestamps from breaking upsert behavior
  const { _id, createdAt, updatedAt, ...body } = req.body || {};
  const payload = { ...body, updatedBy: req.user._id, ...scope(req) };

  const doc = await HomePageSettings.findOneAndUpdate(
    scope(req),
    payload,
    { new: true, upsert: true, runValidators: true }
  );

  await audit({
    actor: req.user._id,
    action: 'CMS_HOMEPAGE_UPDATED',
    entity: 'HomePageSettings',
    entityId: doc._id,
    metadata: payload
  });
  res.json(doc);
});
router.get('/platform-settings', async (req, res) => {
  const doc = await PlatformSettings.findOne(req.user ? scope(req) : {});
  res.json(doc || await PlatformSettings.create({}));
});
router.patch('/platform-settings', protect, allowRoles(...cmsRoles), async (req, res) => {
  // Prevent client-provided _id / timestamps from breaking upsert behavior
  const { _id, createdAt, updatedAt, ...body } = req.body || {};
  const payload = { ...body, updatedBy: req.user._id, ...scope(req) };

  const doc = await PlatformSettings.findOneAndUpdate(
    scope(req),
    payload,
    { new: true, upsert: true, runValidators: true }
  );

  await audit({
    actor: req.user._id,
    action: 'PLATFORM_SETTINGS_UPDATED',
    entity: 'PlatformSettings',
    entityId: doc._id,
    metadata: payload
  });
  res.json(doc);
});
export default router;
