import mongoose from 'mongoose';

const beltLabels = {
  WHITE: 'Blanche',
  BLUE: 'Bleue',
  PURPLE: 'Violette',
  BROWN: 'Marron',
  BLACK: 'Noire'
};

function formatDegree(value) {
  const degree = Number(value);
  if (!Number.isFinite(degree) || degree <= 0) return '';
  return degree === 1 ? '1er degre' : `${degree}e degre`;
}

function formatGrade(belt, degree) {
  const beltLabel = beltLabels[belt] || belt || '';
  if (!beltLabel) return '';
  if (belt === 'BLACK' && degree) return `${beltLabel} - ${formatDegree(degree)}`;
  return beltLabel;
}

function syncGradePayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;

  if (!payload.jiujitsuBelt && payload.belt) payload.jiujitsuBelt = payload.belt;
  if (payload.jiujitsuBelt) payload.belt = payload.jiujitsuBelt;

  if (payload.jiujitsuBlackBeltDegree == null && payload.blackBeltDegree != null) {
    payload.jiujitsuBlackBeltDegree = payload.blackBeltDegree;
  }

  if (payload.jiujitsuBelt !== 'BLACK') payload.jiujitsuBlackBeltDegree = undefined;
  if (payload.newazaBelt !== 'BLACK') payload.newazaBlackBeltDegree = undefined;

  payload.blackBeltDegree = payload.jiujitsuBlackBeltDegree;
  return payload;
}

const athleteSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  photo: String,
  phone: String,
  city: String,
  birthDate: Date,
  gender: { type: String, enum: ['MALE', 'FEMALE'] },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  category: { type: String, required: true },
  weight: Number,
  belt: { type: String, enum: ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'], default: 'WHITE' },
  blackBeltDegree: { type: Number, min: 1, max: 10 },
  jiujitsuBelt: { type: String, enum: ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'], default: 'WHITE' },
  jiujitsuBlackBeltDegree: { type: Number, min: 1, max: 10 },
  newazaBelt: { type: String, enum: ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'], default: 'WHITE' },
  newazaBlackBeltDegree: { type: Number, min: 1, max: 10 },
  rankingPoints: { type: Number, default: 0 },
  licenseNumber: String,
  licenseStatus: { type: String, enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED'], default: 'PENDING' },
  achievements: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

athleteSchema.pre('validate', function syncLegacyGrades(next) {
  syncGradePayload(this);
  next();
});

athleteSchema.pre('findOneAndUpdate', function syncLegacyGradesInQuery(next) {
  const update = this.getUpdate() || {};
  const source = update.$set || update;
  syncGradePayload(source);
  if (update.$set) this.setUpdate({ ...update, $set: source });
  next();
});

athleteSchema.virtual('jiujitsuGrade').get(function jiujitsuGrade() {
  return formatGrade(this.jiujitsuBelt || this.belt, this.jiujitsuBlackBeltDegree || this.blackBeltDegree);
});

athleteSchema.virtual('newazaGrade').get(function newazaGrade() {
  return formatGrade(this.newazaBelt, this.newazaBlackBeltDegree);
});

athleteSchema.virtual('technicalGrade').get(function technicalGrade() {
  return this.jiujitsuGrade;
});

athleteSchema.virtual('technicalGradesSummary').get(function technicalGradesSummary() {
  const parts = [];
  if (this.jiujitsuGrade) parts.push(`Jiu-Jitsu: ${this.jiujitsuGrade}`);
  if (this.newazaGrade) parts.push(`Newaza: ${this.newazaGrade}`);
  return parts.join(' | ');
});

athleteSchema.index({ firstName: 'text', lastName: 'text', category: 'text', belt: 'text' });
export default mongoose.model('Athlete', athleteSchema);
