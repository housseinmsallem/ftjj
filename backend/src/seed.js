import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Federation from './models/Federation.js';
import Club from './models/Club.js';
import Athlete from './models/Athlete.js';
import Coach from './models/Coach.js';
import Referee from './models/Referee.js';
import Competition from './models/Competition.js';
import ContentBlock from './models/ContentBlock.js';
import Document from './models/Document.js';
import License from './models/License.js';

import PlatformSettings from './models/PlatformSettings.js';
import HomePageSettings from './models/HomePageSettings.js';
import Event from './models/Event.js';
import News from './models/News.js';
import CompetitionRegistration from './models/CompetitionRegistration.js';
import Category from './models/Category.js';
import Bracket from './models/Bracket.js';
import Fight from './models/Fight.js';
import ScoringSession from './models/ScoringSession.js';


dotenv.config();
await connectDB();

const federation = await Federation.findOneAndUpdate(
  { slug: 'ftjj' },
  {
    name: 'Federation Tunisienne de Jiu-Jitsu',
    slug: 'ftjj',
    primaryColor: '#d71920',
    secondaryColor: '#05070b',
    domain: 'ftjj.tn'
  },
  { upsert: true, new: true }
);

await Promise.all([
  User.deleteMany(),
  Club.deleteMany(),
  Athlete.deleteMany(),
  Coach.deleteMany(),
  Referee.deleteMany(),
  Document.deleteMany(),
  License.deleteMany(),
  Competition.deleteMany(),
  ContentBlock.deleteMany(),
  PlatformSettings.deleteMany(),
  HomePageSettings.deleteMany(),
  Event.deleteMany(),
  News.deleteMany(),
  CompetitionRegistration.deleteMany(),
  Category.deleteMany(),
  Bracket.deleteMany(),
  Fight.deleteMany(),
  ScoringSession.deleteMany()
]);

const club = await Club.create({
  federation: federation._id,
  name: 'AIVO Jiu-Jitsu Club',
  governorate: 'Tunis',
  president: 'President Club',
  email: 'club@ftjj.tn',
  phone: '+216 00 000 000',
  affiliationStatus: 'APPROVED'
});


const [berserkers, gracie, tunisAcademy] = await Club.create([
  { federation: federation._id, name: "Berserker's Team", governorate: 'Tunis', president: 'Nelson Manager', email: 'berserkers@ftjj.tn', phone: '+216 20 100 100', affiliationStatus: 'APPROVED' },
  { federation: federation._id, name: 'Gracie Barra London', governorate: 'London', president: 'GB London', email: 'gblondon@example.com', phone: '+44 20 0000 0000', affiliationStatus: 'APPROVED' },
  { federation: federation._id, name: 'Tunis Jiu-Jitsu Academy', governorate: 'Tunis', president: 'Academy Director', email: 'academy@ftjj.tn', phone: '+216 20 200 200', affiliationStatus: 'APPROVED' }
]);

const [athleteAhmed, athleteYassine] = await Athlete.create([
  {
    federation: federation._id,
    firstName: 'Ahmed',
    lastName: 'Mansouri',
    phone: '+216 20 111 111',
    city: 'Tunis',
    birthDate: new Date('1998-04-12'),
    gender: 'MALE',
    club: club._id,
    category: 'Adult -77kg',
    weight: 77,
    belt: 'BLACK',
    blackBeltDegree: 1,
    jiujitsuBelt: 'BLACK',
    jiujitsuBlackBeltDegree: 1,
    newazaBelt: 'BROWN',
    rankingPoints: 320,
    licenseNumber: 'ATH-2026-001',
    achievements: ['Championnat national 2025', 'Open Tunis 2026'],
    licenseStatus: 'ACTIVE'
  },
  {
    federation: federation._id,
    firstName: 'Yassine',
    lastName: 'Trabelsi',
    phone: '+216 20 222 222',
    city: 'Sfax',
    birthDate: new Date('2000-09-03'),
    gender: 'MALE',
    club: club._id,
    category: 'Adult -85kg',
    weight: 85,
    belt: 'PURPLE',
    jiujitsuBelt: 'PURPLE',
    newazaBelt: 'BLUE',
    rankingPoints: 180,
    licenseNumber: 'ATH-2026-002',
    achievements: ['Open Carthage 2026'],
    licenseStatus: 'ACTIVE'
  }
]);

const coach = await Coach.create({
  federation: federation._id,
  name: 'Coach National',
  email: 'coach@ftjj.tn',
  phone: '+216 21 333 333',
  club: club._id,
  licenseNumber: 'COA-2026-001',
  certifications: ['FTJJ Niveau 1'],
  specialties: ['No-Gi', 'Competition'],
  experienceYears: 8,
  bio: 'Preparation competition, pedagogie club et accompagnement technique.',
  licenseStatus: 'ACTIVE'
});


const demoAthletes = await Athlete.create([
  { federation: federation._id, firstName: 'Nelson', lastName: 'Craft', club: berserkers._id, category: 'Pro Men -76.9 kg', weight: 76.9, gender: 'MALE', belt: 'BLUE', jiujitsuBelt: 'BLUE', newazaBelt: 'BLUE', licenseNumber: 'FTJJ-DEMO-RED', licenseStatus: 'ACTIVE', rankingPoints: 50 },
  { federation: federation._id, firstName: 'Mike', lastName: 'Smith', club: gracie._id, category: 'Pro Men -76.9 kg', weight: 76.9, gender: 'MALE', belt: 'BLUE', jiujitsuBelt: 'BLUE', newazaBelt: 'BLUE', licenseNumber: 'FTJJ-DEMO-BLUE', licenseStatus: 'ACTIVE', rankingPoints: 45 },
  { federation: federation._id, firstName: 'Sami', lastName: 'Ben Ali', club: tunisAcademy._id, category: 'Pro Men -76.9 kg', weight: 75, gender: 'MALE', belt: 'BLUE', jiujitsuBelt: 'BLUE', newazaBelt: 'BLUE', licenseNumber: 'FTJJ-DEMO-003', licenseStatus: 'ACTIVE' },
  { federation: federation._id, firstName: 'Karim', lastName: 'Mrad', club: berserkers._id, category: 'Pro Men -76.9 kg', weight: 76, gender: 'MALE', belt: 'BLUE', jiujitsuBelt: 'BLUE', newazaBelt: 'BLUE', licenseNumber: 'FTJJ-DEMO-004', licenseStatus: 'ACTIVE' },
  { federation: federation._id, firstName: 'Youssef', lastName: 'Amri', club: gracie._id, category: 'Pro Men -76.9 kg', weight: 75.5, gender: 'MALE', belt: 'BLUE', jiujitsuBelt: 'BLUE', newazaBelt: 'BLUE', licenseNumber: 'FTJJ-DEMO-005', licenseStatus: 'ACTIVE' },
  { federation: federation._id, firstName: 'Maya', lastName: 'Triki', club: tunisAcademy._id, category: 'Adult Women -63 kg', weight: 62, gender: 'FEMALE', belt: 'WHITE', jiujitsuBelt: 'WHITE', newazaBelt: 'WHITE', licenseNumber: 'FTJJ-DEMO-006', licenseStatus: 'ACTIVE' }
]);

const competition = await Competition.create({
  federation: federation._id,
  title: 'FTJJ Demo Championship',
  type: 'CHAMPIONSHIP',
  date: new Date(),
  location: 'Tunis',
  disciplines: ['NEWAZA','FIGHTING','FULL_CONTACT','DUO'],
  categories: ['Pro Men -76.9 kg', 'Adult Women -63 kg'],
  status: 'registration_open',
  beltGroupingMode: 'separate',
  rulesetName: 'FTJJ',
  maxParticipants: 250,
  liveEnabled: true,
  participants: [athleteAhmed._id, athleteYassine._id, ...demoAthletes.map(a => a._id)]
});


await PlatformSettings.create({ federation: federation._id, federationName: 'Federation Tunisienne de Jiu-Jitsu', shortName: 'FTJJ', primaryColor: '#d71920', secondaryColor: '#05070b', accentColor: '#f5c542', contactEmail: 'contact@ftjj.tn', phone: '+216 00 000 000', address: 'Tunis, Tunisie', footerText: 'FTJJ - Plateforme federale officielle' });
await HomePageSettings.create({ federation: federation._id, heroTitle: 'Federation Tunisienne de Jiu-Jitsu', heroSubtitle: 'Gestion federale, competitions, brackets et live scoring', introduction: 'Plateforme officielle de demonstration FTJJ.', featuredCompetitions: [competition._id], featuredAthletes: demoAthletes.slice(0, 2).map(a => a._id), featuredClubs: [berserkers._id, gracie._id, tunisAcademy._id], isPublished: true });
await Event.create({ federation: federation._id, title: 'Stage federal technique', type: 'STAGE', startDate: new Date(), location: 'Centre federal Tunis', city: 'Tunis', shortDescription: 'Stage technique et preparation competition.', status: 'published', featuredOnHome: true });
await News.create({ federation: federation._id, title: 'Ouverture du FTJJ Demo Championship', summary: 'Les clubs peuvent inscrire leurs athletes.', content: 'La competition de demonstration est prete pour les tests de categories, brackets et scoring.', status: 'published', publishedAt: new Date() });
const demoRegistrations = await CompetitionRegistration.create(demoAthletes.slice(0,5).map((athlete) => ({ federation: federation._id, competitionId: competition._id, clubId: athlete.club, athleteId: athlete._id, firstName: athlete.firstName, lastName: athlete.lastName, gender: athlete.gender, discipline: 'NEWAZA', belt: athlete.belt, ageCategory: 'ADULT', weightDeclared: athlete.weight, weightCategory: '-80kg', licenseNumber: athlete.licenseNumber, licenseStatus: 'ACTIVE', status: 'approved' })));
const demoFight = await Fight.create({ federation: federation._id, competition: competition._id, mat: 'Tatami 1', category: 'Pro Men -76.9 kg Blue Belt', redAthlete: demoAthletes[0]._id, blueAthlete: demoAthletes[1]._id, status: 'SCHEDULED' });
await ScoringSession.create({ federation: federation._id, fight: demoFight._id, competition: competition._id, discipline: 'NEWAZA', durationSeconds: 300, remainingSeconds: 300 });

const referee = await Referee.create({
  federation: federation._id,
  name: 'Arbitre Officiel',
  email: 'referee@ftjj.tn',
  phone: '+216 22 444 444',
  licenseNumber: 'REF-2026-001',
  level: 'NATIONAL',
  certifications: ['Arbitrage national', 'Reglementation competition'],
  availability: true,
  bio: 'Arbitrage national, supervision tatamis et coordination live scoring.',
  events: [competition._id]
});

await License.create([
  {
    federation: federation._id,
    ownerType: 'ATHLETE',
    ownerId: athleteAhmed._id,
    year: 2026,
    status: 'ACTIVE',
    issuedAt: new Date('2026-01-10'),
    expiresAt: new Date('2026-12-31'),
    amount: 65
  },
  {
    federation: federation._id,
    ownerType: 'COACH',
    ownerId: coach._id,
    year: 2026,
    status: 'ACTIVE',
    issuedAt: new Date('2026-01-10'),
    expiresAt: new Date('2026-12-31'),
    amount: 85
  },
  {
    federation: federation._id,
    ownerType: 'REFEREE',
    ownerId: referee._id,
    year: 2026,
    status: 'ACTIVE',
    issuedAt: new Date('2026-01-10'),
    expiresAt: new Date('2026-12-31'),
    amount: 80
  }
]);

await Document.create([
  {
    federation: federation._id,
    title: 'Licence athlete 2026',
    type: 'LICENSE',
    ownerType: 'ATHLETE',
    ownerId: athleteAhmed._id,
    fileUrl: '/documents/licence-athlete-2026.pdf',
    status: 'VALIDATED'
  },
  {
    federation: federation._id,
    title: 'Certificat coach FTJJ',
    type: 'ADMIN',
    ownerType: 'COACH',
    ownerId: coach._id,
    fileUrl: '/documents/certificat-coach.pdf',
    status: 'VALIDATED'
  },
  {
    federation: federation._id,
    title: 'Habilitation arbitre 2026',
    type: 'ADMIN',
    ownerType: 'REFEREE',
    ownerId: referee._id,
    fileUrl: '/documents/habilitation-arbitre.pdf',
    status: 'VALIDATED'
  }
]);

await ContentBlock.create([
  {
    title: 'FTJJ Demo Championship',
    subtitle: 'Saison sportive 2026',
    type: 'CHAMPIONSHIP',
    description: 'Suivez les inscriptions, tableaux et resultats officiels du championnat national.',
    imageUrl: '/assets/images/hero.jpg',
    ctaLabel: 'Voir les competitions',
    ctaUrl: '/competitions',
    startDate: new Date(),
    location: 'Tunis',
    status: 'PUBLISHED',
    displayOrder: 1,
    animation: 'SLIDE'
  },
  {
    title: 'Stage federal technique',
    subtitle: 'Formation coachs et athletes',
    type: 'STAGE',
    description: 'Annoncez les stages, passages de grade et formations depuis le backoffice.',
    imageUrl: '/assets/images/hero.jpg',
    ctaLabel: 'Acceder au live',
    ctaUrl: '/live',
    startDate: new Date(),
    location: 'Centre federal',
    status: 'PUBLISHED',
    displayOrder: 2,
    animation: 'ZOOM'
  }
]);

await User.create([
  { name: 'Administrateur FTJJ', email: 'admin@ftjj.tn', password: 'password123', role: 'FEDERATION_ADMIN', federation: federation._id },
  { name: 'Club Admin', email: 'club@ftjj.tn', password: 'password123', role: 'CLUB_ADMIN', federation: federation._id, club: club._id },
  { name: `${athleteAhmed.firstName} ${athleteAhmed.lastName}`, email: 'athlete@ftjj.tn', password: 'password123', role: 'ATHLETE', federation: federation._id, club: club._id, athleteProfile: athleteAhmed._id },
  { name: coach.name, email: 'coach@ftjj.tn', password: 'password123', role: 'COACH', federation: federation._id, club: club._id, coachProfile: coach._id },
  { name: referee.name, email: 'referee@ftjj.tn', password: 'password123', role: 'REFEREE', federation: federation._id, refereeProfile: referee._id }
]);

console.log('Seed termine. Comptes: admin@ftjj.tn, club@ftjj.tn, athlete@ftjj.tn, coach@ftjj.tn, referee@ftjj.tn / password123');
process.exit(0);
