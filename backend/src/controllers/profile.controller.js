import Athlete from '../models/Athlete.js';
import Coach from '../models/Coach.js';
import Referee from '../models/Referee.js';
import Competition from '../models/Competition.js';
import Document from '../models/Document.js';
import License from '../models/License.js';
import User from '../models/User.js';
import { publicUser } from './auth.controller.js';

const supportedRoles = ['ATHLETE', 'COACH', 'REFEREE'];

const profileFieldsByRole = {
  ATHLETE: ['firstName', 'lastName', 'photo', 'phone', 'city', 'birthDate', 'gender', 'category', 'weight', 'belt', 'blackBeltDegree', 'jiujitsuBelt', 'jiujitsuBlackBeltDegree', 'newazaBelt', 'newazaBlackBeltDegree', 'licenseNumber', 'achievements'],
  COACH: ['name', 'email', 'phone', 'licenseNumber', 'certifications', 'specialties', 'experienceYears', 'bio'],
  REFEREE: ['name', 'email', 'phone', 'licenseNumber', 'level', 'certifications', 'availability', 'bio']
};

function pickDefined(payload = {}, keys = []) {
  return keys.reduce((accumulator, key) => {
    if (payload[key] !== undefined) accumulator[key] = payload[key];
    return accumulator;
  }, {});
}

function splitList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: 'Athlete', lastName: 'FTJJ' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'FTJJ' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getProfileRefKey(role) {
  if (role === 'ATHLETE') return 'athleteProfile';
  if (role === 'COACH') return 'coachProfile';
  if (role === 'REFEREE') return 'refereeProfile';
  return null;
}

function getProfileModel(role) {
  if (role === 'ATHLETE') return Athlete;
  if (role === 'COACH') return Coach;
  if (role === 'REFEREE') return Referee;
  return null;
}

async function populateProfile(role, profileId) {
  const Model = getProfileModel(role);
  if (!Model || !profileId) return null;
  if (role === 'REFEREE') return Model.findById(profileId).populate('events');
  return Model.findById(profileId).populate('club');
}

async function findProfileByFallback(user) {
  if (user.role === 'ATHLETE') {
    const { firstName, lastName } = splitName(user.name);
    return Athlete.findOne({
      ...(user.club ? { club: user.club } : {}),
      firstName: new RegExp(`^${escapeRegExp(firstName)}$`, 'i'),
      lastName: new RegExp(`^${escapeRegExp(lastName)}$`, 'i')
    }).populate('club');
  }

  if (user.role === 'COACH') {
    return Coach.findOne({
      ...(user.club ? { club: user.club } : {}),
      name: new RegExp(`^${escapeRegExp(user.name)}$`, 'i')
    }).populate('club');
  }

  if (user.role === 'REFEREE') {
    return Referee.findOne({
      name: new RegExp(`^${escapeRegExp(user.name)}$`, 'i')
    }).populate('events');
  }

  return null;
}

async function createProfileFromUser(user) {
  if (user.role === 'ATHLETE') {
    const { firstName, lastName } = splitName(user.name);
    return Athlete.create({
      federation: user.federation,
      club: user.club,
      firstName,
      lastName,
      category: 'A definir',
      belt: 'WHITE',
      jiujitsuBelt: 'WHITE',
      newazaBelt: 'WHITE',
      licenseStatus: 'PENDING'
    });
  }

  if (user.role === 'COACH') {
    return Coach.create({
      federation: user.federation,
      club: user.club,
      name: user.name,
      email: user.email,
      licenseStatus: 'PENDING'
    });
  }

  if (user.role === 'REFEREE') {
    return Referee.create({
      federation: user.federation,
      name: user.name,
      email: user.email,
      availability: true
    });
  }

  return null;
}

async function resolveProfile(user, { createIfMissing = true } = {}) {
  const refKey = getProfileRefKey(user.role);
  if (!refKey) return null;

  let profile = await populateProfile(user.role, user[refKey]);

  if (!profile) profile = await findProfileByFallback(user);

  if (!profile && createIfMissing) {
    const created = await createProfileFromUser(user);
    if (!created) return null;
    profile = await populateProfile(user.role, created._id);
  }

  if (profile && String(user[refKey] || '') !== String(profile._id)) {
    user[refKey] = profile._id;
    await user.save();
  }

  return profile;
}

function normalizeProfilePayload(role, rawPayload = {}) {
  const payload = pickDefined(rawPayload, profileFieldsByRole[role] || []);

  if (role === 'ATHLETE') {
    if (payload.weight !== undefined) payload.weight = toNumberOrNull(payload.weight);
    if (payload.blackBeltDegree !== undefined && payload.jiujitsuBlackBeltDegree === undefined) payload.jiujitsuBlackBeltDegree = payload.blackBeltDegree;
    if (payload.belt && payload.jiujitsuBelt === undefined) payload.jiujitsuBelt = payload.belt;
    if (payload.jiujitsuBlackBeltDegree !== undefined) payload.jiujitsuBlackBeltDegree = toNumberOrNull(payload.jiujitsuBlackBeltDegree);
    if (payload.newazaBlackBeltDegree !== undefined) payload.newazaBlackBeltDegree = toNumberOrNull(payload.newazaBlackBeltDegree);
    if (payload.achievements !== undefined) payload.achievements = splitList(payload.achievements);
    if (payload.jiujitsuBelt && payload.jiujitsuBelt !== 'BLACK') payload.jiujitsuBlackBeltDegree = null;
    if (payload.newazaBelt && payload.newazaBelt !== 'BLACK') payload.newazaBlackBeltDegree = null;
    if (payload.jiujitsuBelt !== undefined) payload.belt = payload.jiujitsuBelt;
    if (payload.jiujitsuBlackBeltDegree !== undefined) payload.blackBeltDegree = payload.jiujitsuBlackBeltDegree;
  }

  if (role === 'COACH') {
    if (payload.experienceYears !== undefined) payload.experienceYears = toNumberOrNull(payload.experienceYears);
    if (payload.certifications !== undefined) payload.certifications = splitList(payload.certifications);
    if (payload.specialties !== undefined) payload.specialties = splitList(payload.specialties);
  }

  if (role === 'REFEREE') {
    if (payload.certifications !== undefined) payload.certifications = splitList(payload.certifications);
    if (payload.availability !== undefined) {
      payload.availability = payload.availability === true || payload.availability === 'true';
    }
  }

  return payload;
}

async function buildProfilePayload(user, profile) {
  const response = {
    role: user.role,
    user: publicUser(user),
    profile,
    club: profile?.club || null,
    related: {
      documents: [],
      licenses: []
    }
  };

  if (!profile) return response;

  const ownerType = user.role;
  const [documents, licenses] = await Promise.all([
    Document.find({ ownerType, ownerId: profile._id }).sort({ createdAt: -1 }).limit(8),
    License.find({ ownerType, ownerId: profile._id }).sort({ year: -1, createdAt: -1 }).limit(8)
  ]);

  response.related.documents = documents;
  response.related.licenses = licenses;

  if (user.role === 'ATHLETE') {
    response.related.competitions = await Competition.find({ participants: profile._id }).sort({ date: 1 }).limit(12);
  }

  if (user.role === 'COACH') {
    const athletes = await Athlete.find({ ...(profile.club ? { club: profile.club._id || profile.club } : {}) }).populate('club').sort({ lastName: 1, firstName: 1 }).limit(24);
    const athleteIds = athletes.map((athlete) => athlete._id);
    response.related.athletes = athletes;
    response.related.competitions = athleteIds.length
      ? await Competition.find({ participants: { $in: athleteIds } }).sort({ date: 1 }).limit(12)
      : await Competition.find({}).sort({ date: 1 }).limit(12);
  }

  if (user.role === 'REFEREE') {
    response.related.events = Array.isArray(profile.events) ? profile.events : [];
    if (!response.related.events.length) {
      response.related.events = await Competition.find({ liveEnabled: true }).sort({ date: 1 }).limit(12);
    }
  }

  return response;
}

export async function getMyProfile(req, res) {
  if (!supportedRoles.includes(req.user.role)) return res.status(403).json({ message: 'Espace non disponible pour ce role' });

  const user = await User.findById(req.user._id).select('-password');
  const profile = await resolveProfile(user);

  res.json(await buildProfilePayload(user, profile));
}

export async function updateMyProfile(req, res) {
  if (!supportedRoles.includes(req.user.role)) return res.status(403).json({ message: 'Espace non disponible pour ce role' });

  const user = await User.findById(req.user._id).select('-password');
  const accountPayload = pickDefined(req.body?.user || {}, ['name', 'email']);
  const profilePayload = normalizeProfilePayload(req.user.role, req.body?.profile || {});
  const profile = await resolveProfile(user);

  if (!profile) return res.status(404).json({ message: 'Profil introuvable' });

  if (accountPayload.email) {
    accountPayload.email = String(accountPayload.email).trim().toLowerCase();
    const existing = await User.findOne({ email: accountPayload.email, _id: { $ne: user._id } });
    if (existing) return res.status(409).json({ message: 'Un compte existe deja avec cet email' });
  }

  if (req.user.role === 'ATHLETE') {
    if (accountPayload.name && profilePayload.firstName === undefined && profilePayload.lastName === undefined) {
      const { firstName, lastName } = splitName(accountPayload.name);
      profilePayload.firstName = firstName;
      profilePayload.lastName = lastName;
    }
  }

  if ((req.user.role === 'COACH' || req.user.role === 'REFEREE') && accountPayload.name && profilePayload.name === undefined) {
    profilePayload.name = accountPayload.name;
  }

  Object.assign(profile, profilePayload);
  await profile.save();

  if (accountPayload.email) user.email = accountPayload.email;

  if (req.user.role === 'ATHLETE') {
    user.name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user.name;
  } else {
    user.name = profile.name || accountPayload.name || user.name;
  }

  const profileEmail = profile.email || user.email;
  if ((req.user.role === 'COACH' || req.user.role === 'REFEREE') && !profile.email && profileEmail) {
    profile.email = profileEmail;
    await profile.save();
  }

  await user.save();

  const freshUser = await User.findById(user._id).select('-password');
  const freshProfile = await resolveProfile(freshUser, { createIfMissing: false });

  res.json(await buildProfilePayload(freshUser, freshProfile));
}
