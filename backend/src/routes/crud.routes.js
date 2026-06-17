import express from 'express';
import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Coach from '../models/Coach.js';
import Referee from '../models/Referee.js';
import Competition from '../models/Competition.js';
import Document from '../models/Document.js';
import Payment from '../models/Payment.js';
import { protect, allowRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

const resources = {
  clubs: Club,
  athletes: Athlete,
  coaches: Coach,
  referees: Referee,
  competitions: Competition,
  documents: Document,
  payments: Payment
};

for (const [name, Model] of Object.entries(resources)) {
  router.get(`/${name}`, async (req, res, next) => {
    try {
      const sort = req.query.sort || '-createdAt';
      const data = await Model.find().sort(sort).populate('club user events');
      res.json({ data });
    } catch (err) { next(err); }
  });

  router.get(`/${name}/:id`, async (req, res, next) => {
    try {
      const item = await Model.findById(req.params.id).populate('club user events');
      if (!item) return res.status(404).json({ message: 'Introuvable' });
      res.json({ data: item });
    } catch (err) { next(err); }
  });

  router.post(`/${name}`, protect, allowRoles('FEDERATION_ADMIN','CLUB_ADMIN'), async (req, res, next) => {
    try {
      const item = await Model.create(req.body);
      res.status(201).json({ data: item });
    } catch (err) { next(err); }
  });

  router.put(`/${name}/:id`, protect, allowRoles('FEDERATION_ADMIN','CLUB_ADMIN'), async (req, res, next) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      res.json({ data: item });
    } catch (err) { next(err); }
  });

  router.delete(`/${name}/:id`, protect, allowRoles('FEDERATION_ADMIN'), async (req, res, next) => {
    try {
      await Model.findByIdAndDelete(req.params.id);
      res.json({ message: 'Supprimé' });
    } catch (err) { next(err); }
  });
}

export default router;
