import { Router } from 'express';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
import { parseMultipart } from '../middlewares/upload.middleware.js';

export function resourceRoutes(controller, adminOnly = false) {
  const router = Router();
  const writeAccess = adminOnly ? [protect, allowRoles('FEDERATION_ADMIN')] : [protect];
  router.get('/', protect, controller.list);
  router.get('/:id', protect, controller.get);
  router.post('/', ...writeAccess, parseMultipart, controller.create);
  router.put('/:id', ...writeAccess, parseMultipart, controller.update);
  router.delete('/:id', protect, allowRoles('FEDERATION_ADMIN'), controller.remove);
  return router;
}
