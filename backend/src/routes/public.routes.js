import { Router } from 'express';
import ContentBlock from '../models/ContentBlock.js';
import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Coach from '../models/Coach.js';
import Referee from '../models/Referee.js';
import User from '../models/User.js';
import Competition from '../models/Competition.js';
import MatchBracket from '../models/MatchBracket.js';
import FederationSettings from '../models/FederationSettings.js';
import PlatformSettings from '../models/PlatformSettings.js';
import HomePageSettings from '../models/HomePageSettings.js';
import Event from '../models/Event.js';
import News from '../models/News.js';
import Bracket from '../models/Bracket.js';
import ScoringSession from '../models/ScoringSession.js';

const router = Router();
router.get('/home', async (req, res, next) => { try {
  const [slider, events, platformSettings, legacySettings] = await Promise.all([
    ContentBlock.find({ status:'PUBLISHED', displayOnHome:true }).sort({ displayOrder:1, startDate:1, createdAt:-1 }).limit(8),
    ContentBlock.find({ status:'PUBLISHED', displayOnHome:true, type: { $in:['EVENT','STAGE','CHAMPIONSHIP','NEWS','ANNOUNCEMENT'] } }).sort({ startDate:1, displayOrder:1, createdAt:-1 }).limit(12),
    PlatformSettings.findOne().lean(),
    FederationSettings.findOne().lean()
  ]);
  const settings = platformSettings || legacySettings;
  const [homepage, news, publicEvents] = await Promise.all([HomePageSettings.findOne({ isPublished: true }).lean(), News.find({ status: 'published' }).sort({ publishedAt: -1, createdAt: -1 }).limit(6).lean(), Event.find({ status: 'published' }).sort({ startDate: 1 }).limit(8).lean()]);
  res.json({ slider, events: publicEvents.length ? publicEvents : events, settings, homepage, news });
} catch(e){ next(e); }});
router.get('/clubs', async (req, res, next) => { try { res.json(await Club.find({ affiliationStatus:'APPROVED' }).sort({ name:1 })); } catch(e){ next(e); }});


router.get('/athletes', async (req, res, next) => { try {
  const q = req.query.q ? { $or:[{ firstName:new RegExp(req.query.q,'i') },{ lastName:new RegExp(req.query.q,'i') }] } : {};
  res.json(await Athlete.find({ ...q, licenseStatus:'ACTIVE' }).populate('club').sort({ rankingPoints:-1, lastName:1 }).limit(100));
} catch(e){ next(e); }});

router.get('/coaches', async (req, res, next) => { try {
  const q = req.query.q ? { name:new RegExp(req.query.q,'i') } : {};
  res.json(await Coach.find(q).populate('club').sort({ name:1 }).limit(100));
} catch(e){ next(e); }});
router.get('/referees', async (req, res, next) => { try {
  const q = req.query.q ? { name:new RegExp(req.query.q,'i') } : {};
  res.json(await Referee.find(q).sort({ level:1, name:1 }).limit(100));
} catch(e){ next(e); }});
router.post('/affiliation', async (req, res, next) => { try {
  const { name, governorate, address, president, email, phone, password, message } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Un compte existe déjà avec cet email' });
  const club = await Club.create({ name, governorate, address, president, email, phone, affiliationStatus:'PENDING', status:'PENDING', notes: message });
  await User.create({ name: president || name, email, password, role:'CLUB_ADMIN', club: club._id, isActive:false });
  res.status(201).json({ message:'Demande affiliation recue. Le compte club sera active apres validation federale.', club });
} catch(e){ next(e); }});

router.get('/competitions', async (req, res, next) => { try { res.json(await Competition.find({ visibility: { $ne: 'private' } }).sort({ date:1, createdAt:-1 }).limit(50)); } catch(e){ next(e); }});
router.get('/competitions/:slug', async (req, res, next) => { try { const competition = await Competition.findOne({ slug: req.params.slug }); if (!competition) return res.status(404).json({ message:'Competition introuvable' }); const [brackets, sessions] = await Promise.all([Bracket.find({ competitionId: competition._id, status:'published' }).populate('categoryId seeds.athlete').lean(), ScoringSession.find({ competition: competition._id, status: { $in: ['finished','validated','live'] } }).populate({ path:'fight', populate:'redAthlete blueAthlete winner' }).lean()]); res.json({ competition, brackets, sessions }); } catch(e){ next(e); }});
router.get('/rankings', async (req, res, next) => { try { res.json(await Athlete.find({ licenseStatus:'ACTIVE' }).populate('club').sort({ rankingPoints:-1, lastName:1 }).limit(100)); } catch(e){ next(e); }});
router.get('/events', async (req, res, next) => { try { res.json(await Event.find({ status:'published' }).sort({ startDate:1 }).limit(100)); } catch(e){ next(e); }});
router.get('/events/:slug', async (req, res, next) => { try { const item = await Event.findOne({ slug:req.params.slug, status:'published' }); if (!item) return res.status(404).json({ message:'Evenement introuvable' }); res.json(item); } catch(e){ next(e); }});
router.get('/news', async (req, res, next) => { try { res.json(await News.find({ status:'published' }).sort({ publishedAt:-1, createdAt:-1 }).limit(100)); } catch(e){ next(e); }});
router.get('/news/:slug', async (req, res, next) => { try { const item = await News.findOne({ slug:req.params.slug, status:'published' }); if (!item) return res.status(404).json({ message:'Actualite introuvable' }); res.json(item); } catch(e){ next(e); }});
router.get('/live', async (req, res, next) => { try {
  res.json(await MatchBracket.find({ status:{ $in:['scheduled','live','finished'] } })
    .populate('competition redAthlete blueAthlete winner')
    .sort({ mat:1, order:1, createdAt:-1 })
    .limit(50));
} catch(e){ next(e); }});
export default router;
