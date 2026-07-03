import Athlete from '../models/Athlete.js';
import ImportBatch from '../models/ImportBatch.js';
import { makeFederalId } from '../utils/federalId.js';
import { cleanText, normalizeForMatch, parseDate, calculateAge, mapColumnHeader } from '../utils/textCleaner.js';
import { audit } from '../utils/audit.js';

/**
 * Parse a file buffer (XLSX or CSV) into an array of row objects.
 *
 * Dependencies required (install if not present):
 *   bun add xlsx csv-parse
 *   or: npm install xlsx csv-parse
 */
async function parseFileBuffer(buffer, mimetype, originalName) {
  const ext = (originalName || '').toLowerCase().split('.').pop();

  if (ext === 'csv' || mimetype === 'text/csv') {
    return parseCSV(buffer);
  }

  // Default to xlsx parsing
  return parseXLSX(buffer);
}

async function parseCSV(buffer) {
  try {
    const { parse } = await import('csv-parse/sync');
    const text = buffer.toString('utf-8');
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true
    });
    return records;
  } catch (err) {
    throw new Error(`Erreur de parsing CSV: ${err.message}. Verifiez que csv-parse est installe (bun add csv-parse).`);
  }
}

async function parseXLSX(buffer) {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Aucune feuille trouvee dans le fichier Excel.');
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows;
  } catch (err) {
    throw new Error(`Erreur de parsing XLSX: ${err.message}. Verifiez que xlsx est installe (bun add xlsx).`);
  }
}

/**
 * Map raw row data to a normalized athlete payload using column header mapping.
 */
function mapRowToPayload(rawRow, clubId, federationId) {
  const payload = {
    club: clubId,
    federation: federationId || undefined,
    validationStatus: 'PENDING'
  };

  for (const [key, value] of Object.entries(rawRow)) {
    const mappedField = mapColumnHeader(key);
    if (mappedField) {
      const cleaned = cleanText(value);

      switch (mappedField) {
        case 'dateOfBirth': {
          const parsed = parseDate(value);
          if (parsed) {
            payload.dateOfBirth = parsed;
            payload.birthDate = parsed;
            payload.age = calculateAge(parsed);
          }
          break;
        }
        case 'gender': {
          const g = cleaned.toUpperCase();
          if (g === 'M' || g === 'MALE' || g === 'HOMME' || g === 'H') {
            payload.gender = 'M';
          } else if (g === 'F' || g === 'FEMALE' || g === 'FEMME' || g === 'FEMININ') {
            payload.gender = 'F';
          } else if (g === 'OTHER' || g === 'AUTRE') {
            payload.gender = 'OTHER';
          }
          break;
        }
        case 'belt': {
          const b = cleaned.toUpperCase();
          const validBelts = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];
          if (validBelts.includes(b)) payload.belt = b;
          else {
            // Try French mapping
            const frenchMap = { 'BLANCHE': 'WHITE', 'BLEUE': 'BLUE', 'VIOLETTE': 'PURPLE', 'MARRON': 'BROWN', 'NOIRE': 'BLACK' };
            if (frenchMap[b]) payload.belt = frenchMap[b];
          }
          break;
        }
        case 'weight': {
          const num = parseFloat(cleaned.replace(',', '.'));
          if (!isNaN(num)) payload.weight = num;
          break;
        }
        case 'age': {
          const num = parseInt(cleaned, 10);
          if (!isNaN(num)) payload.age = num;
          break;
        }
        default:
          if (cleaned) payload[mappedField] = cleaned;
      }
    }
  }

  // Auto-determine category from age/gender/belt if not provided
  if (!payload.category && payload.age && payload.gender && payload.belt) {
    const beltOrder = { 'WHITE': 0, 'BLUE': 1, 'PURPLE': 2, 'BROWN': 3, 'BLACK': 4 };
    const beltLevel = beltOrder[payload.belt] || 0;
    const ageGroup = payload.age < 18 ? 'Junior' : 'Senior';

    if (payload.age < 16) {
      payload.category = 'Kids';
    } else if (payload.age < 18) {
      payload.category = `${ageGroup} - ${payload.gender}`;
    } else {
      payload.category = `${ageGroup} - ${payload.gender}`;
    }
  }

  return payload;
}

/**
 * Check for existing athlete by firstName + lastName + dateOfBirth collision.
 */
async function findExistingAthlete(payload) {
  if (!payload.firstName || !payload.lastName || !payload.dateOfBirth) return null;

  const normalizedFirst = normalizeForMatch(payload.firstName);
  const normalizedLast = normalizeForMatch(payload.lastName);

  // Find all athletes with matching dob, then filter in memory for name match
  const candidates = await Athlete.find({
    dateOfBirth: payload.dateOfBirth
  }).lean();

  for (const candidate of candidates) {
    const candFirst = normalizeForMatch(candidate.firstName || '');
    const candLast = normalizeForMatch(candidate.lastName || '');
    if (candFirst === normalizedFirst && candLast === normalizedLast) {
      return candidate;
    }
  }

  return null;
}

/**
 * Core import function: parse, validate, upsert athletes from a file buffer.
 *
 * Returns the created ImportBatch document.
 */
export async function importClubAthletes({
  buffer,
  mimetype,
  originalName,
  clubId,
  federationId,
  importedBy
}) {
  // 1. Create the batch record
  const batch = await ImportBatch.create({
    federation: federationId,
    club: clubId,
    importedBy,
    entityType: 'ATHLETE',
    sourceFile: originalName || 'upload.xlsx',
    status: 'PROCESSING'
  });

  try {
    // 2. Parse the file
    let rows;
    try {
      rows = await parseFileBuffer(buffer, mimetype, originalName);
    } catch (parseErr) {
      batch.status = 'FAILED';
      batch.rowErrors.push({ row: 0, message: parseErr.message });
      batch.totalRows = 0;
      await batch.save();
      return batch;
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      batch.status = 'FAILED';
      batch.rowErrors.push({ row: 0, message: 'Le fichier est vide ou aucun enregistrement trouve.' });
      batch.totalRows = 0;
      await batch.save();
      return batch;
    }

    batch.totalRows = rows.length;
    let inserted = 0;
    let updated = 0;
    let rejected = 0;
    const errors = [];

    // 3. Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2; // 1-based + 1 for header
      const rawRow = rows[i];

      try {
        const payload = mapRowToPayload(rawRow, clubId, federationId);

        // Validate minimum required fields
        if (!payload.firstName || !payload.lastName) {
          errors.push({
            row: rowIndex,
            message: 'Nom et prenom obligatoires.',
            data: rawRow
          });
          rejected++;
          continue;
        }

        // Check for existing athlete collision
        const existing = await findExistingAthlete(payload);

        if (existing) {
          // Update existing athlete
          const updatePayload = { ...payload };
          delete updatePayload.federalId; // preserve existing federalId
          delete updatePayload.federation; // preserve

          // Add association history entry if club changed
          if (String(existing.club || '') !== String(clubId)) {
            const historyEntry = {
              clubId: existing.club,
              fromDate: existing.createdAt || existing.updatedAt,
              toDate: new Date(),
              reason: 'Import massif - reassignation',
              modifiedBy: importedBy
            };
            updatePayload.$push = { associationHistory: historyEntry };
            updatePayload.club = clubId;
          }

          await Athlete.findByIdAndUpdate(existing._id, updatePayload, { new: true });
          updated++;
        } else {
          // Create new athlete with federalId
          payload.federalId = await makeFederalId('ATHLETE');

          // Set validation status
          payload.validationStatus = 'PENDING';

          await Athlete.create(payload);
          inserted++;
        }
      } catch (rowErr) {
        errors.push({
          row: rowIndex,
          message: rowErr.message || 'Erreur de traitement de la ligne.',
          data: rawRow
        });
        rejected++;
      }
    }

    // 4. Update batch with results
    batch.inserted = inserted;
    batch.updated = updated;
    batch.rejected = rejected;
    batch.rowErrors = errors;
    batch.status = rejected > 0 && (inserted > 0 || updated > 0) ? 'PARTIAL' : 'COMPLETED';

    if (rejected === rows.length) {
      batch.status = 'FAILED';
    }

    await batch.save();

    // 5. Audit log
    await audit({
      actor: importedBy,
      action: 'ATHLETE_IMPORT_BATCH',
      entity: 'ImportBatch',
      entityId: batch._id,
      metadata: {
        club: clubId,
        sourceFile: originalName,
        totalRows: rows.length,
        inserted,
        updated,
        rejected
      }
    });

    return batch;
  } catch (error) {
    batch.status = 'FAILED';
    batch.rowErrors.push({ row: 0, message: error.message || 'Erreur serveur inattendue.' });
    await batch.save();
    return batch;
  }
}
