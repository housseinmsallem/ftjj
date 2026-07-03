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

// Sub-schema for tracking historical club associations
const associationEntrySchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  fromDate: Date,
  toDate: Date,
  reason: String,
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false, timestamps: false });

const athleteSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  federalId: { type: String, unique: true, index: { sparse: true } },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  photo: String,
  phone: String,
  city: String,
  birthDate: Date,
  dateOfBirth: Date,
  age: Number,
  gender: { type: String, enum: ['M', 'F', 'OTHER', 'MALE', 'FEMALE'] },
  specialty: { type: String, enum: ['BJJ', 'NE_WAZA', 'MMA', 'JU_JITSU', 'SELF_DEFENSE', 'OTHER'] },
  validationStatus: { type: String, enum: ['DRAFT', 'PENDING', 'VALIDATED', 'REJECTED', 'SUSPENDED'], default: 'PENDING' },
  validatedAt: Date,
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastCorrectionReason: String,
  associationHistory: [associationEntrySchema],
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  currentAssociation: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  category: { type: String },
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

// --- Pre-save hooks ---

athleteSchema.pre('validate', function syncLegacyGrades(next) {
  syncGradePayload(this);
  next();
});

// Compliance guard: require an active federal license for the current season
// before an athlete can be marked as active (licenseStatus = 'ACTIVE').
athleteSchema.pre('save', async function requireLicenseBeforeActivation(next) {
  if (this.isModified('licenseStatus') && this.licenseStatus === 'ACTIVE') {
    const License = mongoose.model('License');
    const currentYear = new Date().getFullYear();

    const activeLicense = await License.findOne({
      ownerType: 'ATHLETE',
      ownerId: this._id,
      year: currentYear,
      status: 'ACTIVE'
    }).lean();

    if (!activeLicense) {
      const err = new Error(
        `Impossible d'activer l'athlete : aucune licence federale active trouvee pour la saison ${currentYear}. ` +
        'Veuillez d\'abord emettre une licence federale.'
      );
      return next(err);
    }

    // Sync the federal license identifier onto the athlete record
    if (activeLicense._id) {
      this.licenseNumber = this.licenseNumber || String(activeLicense._id);
    }
  }
  next();
});

athleteSchema.pre('findOneAndUpdate', function syncLegacyGradesInQuery(next) {
  const update = this.getUpdate() || {};
  const source = update.$set || update;
  syncGradePayload(source);
  if (update.$set) this.setUpdate({ ...update, $set: source });
  next();
});

// --- Virtuals ---

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

// --- Indexes ---

athleteSchema.index({ firstName: 'text', lastName: 'text', category: 'text', belt: 'text' });

export default mongoose.model('Athlete', athleteSchema);
