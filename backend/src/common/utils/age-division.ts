import { AgeDivision, Gender } from '@prisma/client';

// ──────────────────────────────────────────────
// Age Division computation
// ──────────────────────────────────────────────

export interface AgeDivisionInfo {
  division: AgeDivision;
  label: string;
  minAge: number;
  maxAge: number;
  birthYearStart: number;
  birthYearEnd: number;
}

export const AGE_DIVISIONS: Record<AgeDivision, AgeDivisionInfo> = {
  U6:        { division: 'U6',        label: 'U6 (4-5 ans)',           minAge: 4,  maxAge: 5,  birthYearStart: 2021, birthYearEnd: 2022 },
  U8:        { division: 'U8',        label: 'U8 (6-7 ans)',           minAge: 6,  maxAge: 7,  birthYearStart: 2019, birthYearEnd: 2020 },
  U10:       { division: 'U10',       label: 'U10 (8-9 ans)',          minAge: 8,  maxAge: 9,  birthYearStart: 2017, birthYearEnd: 2018 },
  U12:       { division: 'U12',       label: 'U12 (10-11 ans)',        minAge: 10, maxAge: 11, birthYearStart: 2015, birthYearEnd: 2016 },
  U14:       { division: 'U14',       label: 'U14 (12-13 ans)',        minAge: 12, maxAge: 13, birthYearStart: 2013, birthYearEnd: 2014 },
  U16:       { division: 'U16',       label: 'U16 (14-15 ans)',        minAge: 14, maxAge: 15, birthYearStart: 2011, birthYearEnd: 2012 },
  U18:       { division: 'U18',       label: 'U18 (16-17 ans)',        minAge: 16, maxAge: 17, birthYearStart: 2009, birthYearEnd: 2010 },
  U21:       { division: 'U21',       label: 'U21 (18-20 ans)',        minAge: 18, maxAge: 20, birthYearStart: 2006, birthYearEnd: 2008 },
  ADULTS:    { division: 'ADULTS',    label: 'Adultes (18+)',          minAge: 18, maxAge: 34, birthYearStart: 1992, birthYearEnd: 2008 },
  MASTERS_1: { division: 'MASTERS_1', label: 'Masters 1 (35-39 ans)',  minAge: 35, maxAge: 39, birthYearStart: 1987, birthYearEnd: 1991 },
  MASTERS_2: { division: 'MASTERS_2', label: 'Masters 2 (40-44 ans)',  minAge: 40, maxAge: 44, birthYearStart: 1982, birthYearEnd: 1986 },
  MASTERS_3: { division: 'MASTERS_3', label: 'Masters 3 (45-49 ans)',  minAge: 45, maxAge: 49, birthYearStart: 1977, birthYearEnd: 1981 },
  MASTERS_4: { division: 'MASTERS_4', label: 'Masters 4 (50+)',        minAge: 50, maxAge: Infinity, birthYearStart: 1900, birthYearEnd: 1976 },
};

export function getAgeDivision(
  birthYear: number,
  seasonYear: number,
  competitionDate?: Date,
): AgeDivision {
  const refDate = competitionDate || new Date(`${seasonYear}-12-31`);
  const ageOnRef = getAgeOnDate(birthYear, refDate);

  const offset = seasonYear - 2026;
  const match = Object.values(AGE_DIVISIONS).find(d => {
    const bs = d.birthYearStart + offset;
    const be = d.birthYearEnd + offset;
    return birthYear >= bs && birthYear <= be;
  });

  if (!match) return 'ADULTS';

  const div = match.division;

  // Youth divisions: straightforward by birth year
  if (['U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18'].includes(div)) {
    return div;
  }

  // U21, ADULTS, Masters: verify by actual age
  if (div === 'U21') {
    if (ageOnRef >= 18 && ageOnRef <= 20) return 'U21';
    if (ageOnRef >= 18) return 'ADULTS';
    return 'U18';
  }

  if (div === 'ADULTS') {
    if (ageOnRef >= 50) return 'MASTERS_4';
    if (ageOnRef >= 45) return 'MASTERS_3';
    if (ageOnRef >= 40) return 'MASTERS_2';
    if (ageOnRef >= 35) return 'MASTERS_1';
    if (ageOnRef >= 18) return 'ADULTS';
    return 'U18';
  }

  if (div.startsWith('MASTERS')) {
    if (ageOnRef >= match.minAge && ageOnRef <= match.maxAge) return div;
    if (ageOnRef >= 50) return 'MASTERS_4';
    if (ageOnRef >= 45) return 'MASTERS_3';
    if (ageOnRef >= 40) return 'MASTERS_2';
    if (ageOnRef >= 35) return 'MASTERS_1';
    if (ageOnRef >= 18) return 'ADULTS';
    return 'U18';
  }

  return div;
}

function getAgeOnDate(birthYear: number, date: Date): number {
  const birthDate = new Date(birthYear, 0, 1);
  let age = date.getFullYear() - birthDate.getFullYear();
  const mD = date.getMonth() - birthDate.getMonth();
  const dD = date.getDate() - birthDate.getDate();
  if (mD < 0 || (mD === 0 && dD < 0)) age--;
  return age;
}

export function getAgeDivisionLabel(division: AgeDivision): string {
  return AGE_DIVISIONS[division]?.label || division;
}

// ──────────────────────────────────────────────
// Weight Categories per Age Division (JJIF)
// ──────────────────────────────────────────────

const MALE_WEIGHT: Record<string, number[]> = {
  U10:       [22, 25, 28, 32, 36, 40, 44],
  U12:       [25, 28, 32, 36, 40, 44, 48, 52],
  U14:       [32, 36, 40, 44, 48, 52, 56, 62, 69],
  U16:       [40, 44, 48, 52, 56, 62, 69, 77],
  U18:       [48, 52, 56, 62, 69, 77, 85],
  U21:       [56, 62, 69, 77, 85, 94],
  ADULTS:    [56, 62, 69, 77, 85, 94],
  MASTERS_1: [56, 62, 69, 77, 85, 94],
  MASTERS_2: [56, 62, 69, 77, 85, 94],
  MASTERS_3: [56, 62, 69, 77, 85, 94],
  MASTERS_4: [56, 62, 69, 77, 85, 94],
};

const FEMALE_WEIGHT: Record<string, number[]> = {
  U10:       [20, 22, 25, 28, 32, 36, 40],
  U12:       [22, 25, 28, 32, 36, 40, 44, 48],
  U14:       [25, 28, 32, 36, 40, 44, 48, 52, 57],
  U16:       [32, 36, 40, 44, 48, 52, 57, 63],
  U18:       [40, 44, 48, 52, 57, 63, 70],
  U21:       [45, 48, 52, 57, 63, 70],
  ADULTS:    [45, 48, 52, 57, 63, 70],
  MASTERS_1: [45, 48, 52, 57, 63, 70],
  MASTERS_2: [45, 48, 52, 57, 63, 70],
  MASTERS_3: [45, 48, 52, 57, 63, 70],
  MASTERS_4: [45, 48, 52, 57, 63, 70],
};

export function getWeightCategory(
  weight: number | null | undefined,
  gender: string,
  ageDivision: string | AgeDivision,
): string {
  if (!weight || weight <= 0) return 'OPEN';
  const cats = gender === 'FEMALE' ? (FEMALE_WEIGHT[ageDivision] || []) : (MALE_WEIGHT[ageDivision] || []);
  if (cats.length === 0) return 'OPEN';
  for (const limit of cats) {
    if (weight <= limit) return `-${limit}kg`;
  }
  return `+${cats[cats.length - 1]}kg`;
}

export function getWeightCategories(
  ageDivision: string | AgeDivision,
  gender: string,
): string[] {
  const cats = gender === 'FEMALE' ? (FEMALE_WEIGHT[ageDivision] || []) : (MALE_WEIGHT[ageDivision] || []);
  if (cats.length === 0) return ['OPEN'];
  const result = cats.map(l => `-${l}kg`);
  result.push(`+${cats[cats.length - 1]}kg`);
  return result;
}

export function getBeltGroup(grade: string): string {
  const g = (grade || '').toUpperCase();
  if (g.includes('BLACK')) return 'Noire';
  if (g.includes('BROWN') || g.includes('MARRON')) return 'Marron';
  if (g.includes('PURPLE') || g.includes('VIOLET')) return 'Violette';
  if (g.includes('BLUE') || g.includes('BLEU')) return 'Bleue';
  return 'Blanche';
}

export function validateAgeDivision(
  birthYear: number,
  competitionDivision: AgeDivision,
  seasonYear: number,
  competitionDate?: Date,
): { valid: boolean; computedDivision: AgeDivision; message?: string } {
  const computed = getAgeDivision(birthYear, seasonYear, competitionDate);
  if (computed === competitionDivision) {
    return { valid: true, computedDivision: computed };
  }
  const msg = `L'athlète est dans la division ${getAgeDivisionLabel(computed)} mais la compétition est pour ${getAgeDivisionLabel(competitionDivision)}.`;
  return { valid: false, computedDivision: computed, message: msg };
}

export function getCurrentSeasonYear(): number {
  return 2026;
}
