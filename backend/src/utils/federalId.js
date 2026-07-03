import crypto from 'crypto';
import Club from '../models/Club.js';
import Athlete from '../models/Athlete.js';
import Coach from '../models/Coach.js';
import Referee from '../models/Referee.js';

// Static prefix map — no DB dependency for the prefix portion
const PREFIX_MAP = {
  CLUB: 'CLB',
  ATHLETE: 'ATH',
  COACH: 'COA',
  REFEREE: 'REF',
  STAFF: 'STF'
};

// Model lookup for collision verification
const MODEL_MAP = {
  CLUB: Club,
  ATHLETE: Athlete,
  COACH: Coach,
  REFEREE: Referee,
  STAFF: null // STAFF may not have a dedicated model; skip collision check
};

/**
 * Generate a unique federal identification string.
 *
 * Format: FTJJ-[TYPE]-[SEASON]-[RANDOM_HEX_BYTES]
 *
 * @param {string}  type   - Entity type: CLUB, ATHLETE, COACH, REFEREE, STAFF
 * @param {string}  season - Optional season identifier (defaults to current year)
 * @returns {string}        - e.g. "FTJJ-CLB-2026-a3f8b2c1d4e5f607"
 */
export async function makeFederalId(type, season) {
  const prefix = PREFIX_MAP[type];
  if (!prefix) {
    throw new Error(`Type federal inconnu: ${type}. Types supportes: ${Object.keys(PREFIX_MAP).join(', ')}`);
  }

  const seasonStr = String(season || new Date().getFullYear());

  // Generate random hex bytes (8 bytes → 16 hex characters)
  const randomBytes = () => crypto.randomBytes(8).toString('hex');

  const Model = MODEL_MAP[type];

  // Attempt up to 5 times in case of collision (astronomically unlikely with 2^64 space)
  for (let attempt = 0; attempt < 5; attempt++) {
    const hexPart = randomBytes();
    const candidate = `FTJJ-${prefix}-${seasonStr}-${hexPart}`;

    // If no model is mapped, return without collision check
    if (!Model) return candidate;

    // Collision check
    const exists = await Model.findOne({ federalId: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }

  // Fallback: append an extra random byte if all attempts collided (should never happen)
  const hexPart = crypto.randomBytes(12).toString('hex');
  return `FTJJ-${prefix}-${seasonStr}-${hexPart}`;
}

/**
 * Normalize a text value for duplicate-prevention comparisons.
 *
 * Collapses all internal whitespace sequences to single spaces,
 * trims leading/trailing whitespace, removes zero-width characters,
 * and lowercases the result for case-insensitive matching.
 *
 * This is designed for pre-storage normalization to prevent
 * near-duplicate entries caused by formatting differences.
 *
 * @param {*} value - The raw input value
 * @returns {string} - Normalized, trimmed, lowercased string
 */
export function normalizeText(value) {
  if (value == null) return '';
  if (typeof value !== 'string') value = String(value);

  return value
    // Strip zero-width characters and BOM
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, ' ')
    // Replace all whitespace sequences (spaces, tabs, newlines) with a single space
    .replace(/\s+/g, ' ')
    // Trim edges
    .trim()
    // Lowercase for case-insensitive matching
    .toLowerCase();
}
