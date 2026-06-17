import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['SUPER_ADMIN', 'FEDERATION_ADMIN', 'COMPETITION_MANAGER', 'CLUB_ADMIN', 'COACH', 'REFEREE', 'ATHLETE', 'TABLE_OPERATOR', 'MEDIA_MANAGER', 'PUBLIC_VIEWER'], default: 'CLUB_ADMIN' },
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  athleteProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' },
  coachProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
  refereeProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Referee' },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  lastLoginAt: Date,
  lastPasswordChangeAt: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.lastPasswordChangeAt = new Date();
  next();
});

userSchema.methods.matchPassword = function(password) { return bcrypt.compare(password, this.password); };
export default mongoose.model('User', userSchema);
