import mongoose from 'mongoose';

const bracketSchema = new mongoose.Schema({
  federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation', index: true },
  competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
  name: String,
  type: { type: String, enum: ['single_elimination','round_robin'], default: 'single_elimination' },
  seeds: [{ position: Number, athlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }, club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' }, registration: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionRegistration' } }],
  rounds: [{ round: Number, matches: [{ matchNumber: Number, redSeed: Number, blueSeed: Number, redAthlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }, blueAthlete: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete' }, fight: { type: mongoose.Schema.Types.ObjectId, ref: 'Fight' }, winnerSeed: Number }] }],
  firstRoundClubConflicts: { type: Number, default: 0 },
  warnings: [String],
  status: { type: String, enum: ['draft','generated','needs_review','locked','published'], default: 'generated' },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedAt: Date,
  publishedAt: Date
}, { timestamps: true });

export default mongoose.model('Bracket', bracketSchema);
