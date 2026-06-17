import mongoose from 'mongoose';
const competitionSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, index: true },
  description: String,
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['OPEN', 'CHAMPIONSHIP', 'STAGE', 'GRADE_PASSAGE', 'NATIONAL_EVENT'], default: 'OPEN' },
  date: { type: Date, required: true },
  location: String,
  poster: String,
  disciplines: [{ type: String, enum: ['NEWAZA','FIGHTING','FULL_CONTACT','DUO'] }],
  categories: [String],
  maxParticipants: Number,
  registrationStatus: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
  status: { type: String, enum: ['draft','registration_open','registration_closed','validation_in_progress','ready_for_brackets','brackets_generated','live','finished','archived'], default: 'draft' },
  visibility: { type: String, enum: ['public','private'], default: 'public' },
  featuredOnHome: { type: Boolean, default: false },
  beltGroupingMode: { type: String, enum: ['separate','combined','open','custom'], default: 'separate' },
  allowedBelts: [{ type: String, enum: ['WHITE','BLUE','PURPLE','BROWN','BLACK'] }],
  combinedBeltGroups: [[String]],
  categoryGenerationRules: mongoose.Schema.Types.Mixed,
  rulesetName: { type: String, enum: ['JJIF','IJJF','FTJJ'], default: 'FTJJ' },
  rulesetSource: String,
  rulesetVersion: String,
  liveEnabled: { type: Boolean, default: false },
  streamUrl: String,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }]
}, { timestamps: true });
competitionSchema.pre('validate', function(next) {
  if (!this.name && this.title) this.name = this.title;
  if (!this.title && this.name) this.title = this.name;
  if (!this.slug && (this.title || this.name)) this.slug = String(this.title || this.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  next();
});
export default mongoose.model('Competition', competitionSchema);
