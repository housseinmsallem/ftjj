import jwt from 'jsonwebtoken';
export function signToken(user) { return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }); }
export function signLegacyToken(user) { return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' }); }
