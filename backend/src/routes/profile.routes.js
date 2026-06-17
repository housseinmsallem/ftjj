import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/profile.controller.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', protect, allowRoles('ATHLETE', 'COACH', 'REFEREE'), getMyProfile);
router.put('/me', protect, allowRoles('ATHLETE', 'COACH', 'REFEREE'), updateMyProfile);

export default router;
