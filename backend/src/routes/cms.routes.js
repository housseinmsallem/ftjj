import { Router } from 'express';
import PlatformSettings from '../models/PlatformSettings.js';
import HomePageSettings from '../models/HomePageSettings.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { audit } from '../utils/audit.js';

const router = Router();
const cmsRoles = ['SUPER_ADMIN','FEDERATION_ADMIN','MEDIA_MANAGER'];
const singletonQuery = {};

function settingsPayload(body, user) {
  const { _id, __v, federation, createdAt, updatedAt, ...fields } = body || {};
  return { ...fields, updatedBy: user._id };
}

async function findOrCreateSingleton(Model, payload = {}) {
  const doc = await Model.findOne(singletonQuery).sort({ createdAt: 1 });
  if (!doc) return Model.create(payload);
  if (Object.keys(payload).length) {
    doc.set(payload);
    await doc.save();
  }
  return doc;
}

router.get('/homepage', async (req, res) => {
  const doc = await findOrCreateSingleton(HomePageSettings);
  await doc.populate('featuredCompetitions featuredAthletes featuredClubs');
  res.json(doc);
});
router.patch('/homepage', protect, allowRoles(...cmsRoles), async (req, res) => {
  const payload = settingsPayload(req.body, req.user);
  const doc = await findOrCreateSingleton(HomePageSettings, payload);
  await doc.populate('featuredCompetitions featuredAthletes featuredClubs');

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
  const doc = await findOrCreateSingleton(PlatformSettings);
  res.json(doc);
});
router.patch('/platform-settings', protect, allowRoles(...cmsRoles), async (req, res) => {
  const payload = settingsPayload(req.body, req.user);
  const doc = await findOrCreateSingleton(PlatformSettings, payload);

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
