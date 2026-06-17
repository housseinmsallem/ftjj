import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';
const router = Router();
router.get('/', protect, async (req,res,next)=>{ try { res.json(await Notification.find({ $or:[{targetRole:'ALL'}, {targetRole:req.user.role}] }).sort({createdAt:-1}).limit(50)); } catch(e){next(e)} });
router.post('/', protect, allowRoles('FEDERATION_ADMIN'), async (req,res,next)=>{ try { res.status(201).json(await Notification.create(req.body)); } catch(e){next(e)} });
router.patch('/:id/send', protect, allowRoles('FEDERATION_ADMIN'), async (req,res,next)=>{ try { res.json(await Notification.findByIdAndUpdate(req.params.id,{status:'sent',sentAt:new Date()},{new:true})); } catch(e){next(e)} });
export default router;
