/**
 * Clean, trim, and normalize string values for import processing.
 * - Trims leading/trailing whitespace
 * - Collapses multiple internal spaces
 * - Removes zero-width and non-printable characters
 * - Normalizes Unicode (NFC)
 * - Uppercases enum-like short codes (M/F, belt ranks, etc.)
 */
export function cleanText(value) {
  if (value == null) return '';
  if (typeof value !== 'string') return String(value);

  let cleaned = value
    // Remove zero-width characters and BOM
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, ' ')
    // Collapse multiple whitespace to single space
    .replace(/\s+/g, ' ')
    .trim();

  // NFC normalization for consistent Unicode representation
  try {
    cleaned = cleaned.normalize('NFC');
  } catch { /* ignore if environment doesn't support it */ }

  return cleaned;
}

/**
 * Normalize a value for case-insensitive matching.
 * Used for collision detection on names.
 */
export function normalizeForMatch(value) {
  return cleanText(value)
    .toLowerCase()
    // Remove accents for tolerant matching
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Parse a date string from various common Excel/CSV formats.
 * Returns a Date object or null if unparseable.
 */
export function parseDate(value) {
  if (!value) return null;

  // If it's an Excel serial date number
  if (typeof value === 'number') {
    // Excel epoch: 1900-01-01 = 1 (with the 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const msPerDay = 86400000;
    const date = new Date(excelEpoch.getTime() + value * msPerDay);
    if (!isNaN(date.getTime())) return date;
  }

  const cleaned = cleanText(value);
  if (!cleaned) return null;

  // Try ISO format first
  const iso = new Date(cleaned);
  if (!isNaN(iso.getTime())) return iso;

  // Try common formats: DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, etc.
  const patterns = [
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/,
    /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const [ , a, b, c ] = match;
      // Assume DD/MM/YYYY for the first pattern
      if (pattern.source.startsWith('^(\\d{1,2})')) {
        const date = new Date(Number(c), Number(b) - 1, Number(a));
        if (!isNaN(date.getTime())) return date;
      } else {
        const date = new Date(Number(a), Number(b) - 1, Number(c));
        if (!isNaN(date.getTime())) return date;
      }
    }
  }

  return null;
}

/**
 * Calculate age from a date of birth.
 */
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Map CSV column headers to our schema field names.
 * Supports French and English variants.
 */
export function mapColumnHeader(header) {
  const normalized = cleanText(header).toLowerCase();

  const mapping = {
    'prenom': 'firstName',
    'firstname': 'firstName',
    'first name': 'firstName',
    'nom': 'lastName',
    'lastname': 'lastName',
    'last name': 'lastName',
    'nom de famille': 'lastName',
    'date de naissance': 'dateOfBirth',
    'date of birth': 'dateOfBirth',
    'date naissance': 'dateOfBirth',
    'birthdate': 'dateOfBirth',
    'naissance': 'dateOfBirth',
    'age': 'age',
    'genre': 'gender',
    'gender': 'gender',
    'sexe': 'gender',
    'sex': 'gender',
    'specialite': 'specialty',
    'specialty': 'specialty',
    'discipline': 'specialty',
    'telephone': 'phone',
    'phone': 'phone',
    'tel': 'phone',
    'ville': 'city',
    'city': 'city',
    'categorie': 'category',
    'category': 'category',
    'poids': 'weight',
    'weight': 'weight',
    'ceinture': 'belt',
    'belt': 'belt',
    'grade': 'belt',
    'ceinture jiujitsu': 'jiujitsuBelt',
    'jiujitsu belt': 'jiujitsuBelt',
  };

  return mapping[normalized] || null;
}
