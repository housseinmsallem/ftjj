import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import EmailVerificationToken from '../models/EmailVerificationToken.js';
import { signToken } from '../utils/token.js';
import { randomToken, hashToken } from '../utils/crypto.js';
import { sendMail } from '../services/mail.service.js';
import { audit } from '../utils/audit.js';

export const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  federation: user.federation,
  club: user.club,
  athleteProfile: user.athleteProfile,
  coachProfile: user.coachProfile,
  refereeProfile: user.refereeProfile,
  isActive: user.isActive,
  emailVerified: user.emailVerified
});

async function issueRefreshToken(user, req) {
  const token = randomToken();
  await RefreshToken.create({ user: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), userAgent: req.headers['user-agent'], ip: req.ip });
  return token;
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password)) || !user.isActive) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  user.lastLoginAt = new Date();
  await user.save();
  await audit({ actor: user._id, action: 'AUTH_LOGIN', entity: 'User', entityId: user._id, meta: { ip: req.ip } });
  res.json({ token: signToken(user), refreshToken: await issueRefreshToken(user, req), user: publicUser(user) });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token requis' });
  const found = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken), revokedAt: null }).populate('user');
  if (!found || found.expiresAt < new Date() || !found.user?.isActive) return res.status(401).json({ message: 'Session expiree' });
  res.json({ token: signToken(found.user), user: publicUser(found.user) });
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) await RefreshToken.updateOne({ tokenHash: hashToken(refreshToken) }, { revokedAt: new Date() });
  res.json({ message: 'Session fermee' });
}

export async function requestPasswordReset(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    const token = randomToken();
    await PasswordResetToken.create({ user: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 30) });
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await sendMail({ to: user.email, subject: 'FTJJ - Reinitialisation mot de passe', text: `Lien de reinitialisation: ${resetUrl}`, html: `<p>Lien de reinitialisation FTJJ:</p><p><a href="${resetUrl}">${resetUrl}</a></p>` });
  }
  res.json({ message: 'Si ce compte existe, un email de reinitialisation a ete envoye.' });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const record = await PasswordResetToken.findOne({ tokenHash: hashToken(token), usedAt: null }).populate('user');
  if (!record || record.expiresAt < new Date()) return res.status(400).json({ message: 'Lien invalide ou expire' });
  record.user.password = password;
  await record.user.save();
  record.usedAt = new Date();
  await record.save();
  await RefreshToken.updateMany({ user: record.user._id }, { revokedAt: new Date() });
  await audit({ actor: record.user._id, action: 'AUTH_PASSWORD_RESET', entity: 'User', entityId: record.user._id });
  res.json({ message: 'Mot de passe modifie avec succes' });
}

export async function requestEmailVerification(req, res) {
  const user = req.user;
  const token = randomToken();
  await EmailVerificationToken.create({ user: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) });
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  await sendMail({ to: user.email, subject: 'FTJJ - Verification email', text: `Verifier votre email: ${verifyUrl}`, html: `<p>Verifier votre email FTJJ:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>` });
  res.json({ message: 'Email de verification envoye' });
}

export async function verifyEmail(req, res) {
  const { token } = req.body;
  const record = await EmailVerificationToken.findOne({ tokenHash: hashToken(token), usedAt: null }).populate('user');
  if (!record || record.expiresAt < new Date()) return res.status(400).json({ message: 'Lien invalide ou expire' });
  record.user.emailVerified = true;
  await record.user.save();
  record.usedAt = new Date();
  await record.save();
  await audit({ actor: record.user._id, action: 'AUTH_EMAIL_VERIFIED', entity: 'User', entityId: record.user._id });
  res.json({ message: 'Email verifie' });
}

export async function me(req, res) { res.json({ user: publicUser(req.user) }); }
