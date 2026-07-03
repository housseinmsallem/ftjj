import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Coach from '../models/Coach.js';
import Referee from '../models/Referee.js';
import Competition from '../models/Competition.js';
import Payment from '../models/Payment.js';
import Document from '../models/Document.js';
import Event from '../models/Event.js';
import CompetitionRegistration from '../models/CompetitionRegistration.js';
import ScoringSession from '../models/ScoringSession.js';

export async function stats(req, res) {
  const [clubs, athletes, coaches, referees, competitions, upcomingEvents, pendingRegistrations, liveCompetitions, liveFights, pendingDocs, paidPayments] = await Promise.all([
    Club.countDocuments(),
    Athlete.countDocuments(),
    Coach.countDocuments(),
    Referee.countDocuments(),
    Competition.countDocuments(),
    Event.countDocuments({ startDate: { $gte: new Date() }, status: 'published' }),
    CompetitionRegistration.countDocuments({ status: { $in: ['submitted', 'pending_validation', 'modified'] } }),
    Competition.countDocuments({ status: 'live' }),
    ScoringSession.countDocuments({ status: 'live' }),
    Document.countDocuments({ status: 'PENDING' }),
    Payment.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  const latestRegistrations = await CompetitionRegistration.find().sort({ createdAt: -1 }).limit(5);
  res.json({ clubs, athletes, coaches, referees, competitions, upcomingEvents, pendingRegistrations, liveCompetitions, liveFights, pendingDocs, revenue: paidPayments[0]?.total || 0, latestRegistrations, alerts: pendingRegistrations ? [`${pendingRegistrations} inscriptions a valider`] : [] });
}
