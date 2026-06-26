function normalizeBeltGroup(reg, competition) {
  const belt = reg.belt || 'WHITE';
  const mode = competition.beltGroupingMode || 'separate';
  if (mode === 'open') return { label: 'Open Grade', belts: [belt] };
  if (mode === 'combined') {
    const groups = competition.combinedBeltGroups?.length ? competition.combinedBeltGroups : [['WHITE','BLUE'], ['PURPLE','BROWN'], ['BLACK']];
    const found = groups.find((group) => group.includes(belt));
    return { label: found ? found.join('+') : belt, belts: found || [belt] };
  }
  if (mode === 'custom') {
    const groups = competition.categoryGenerationRules?.beltGroups || competition.combinedBeltGroups || [];
    const found = groups.find((group) => group.includes(belt));
    return { label: found ? found.join('+') : belt, belts: found || [belt] };
  }
  return { label: belt, belts: [belt] };
}

export function inferAgeCategory(reg) {
  if (reg.ageCategory) return reg.ageCategory;
  if (!reg.birthDate) return 'ADULT';
  const age = Math.floor((Date.now() - new Date(reg.birthDate).getTime()) / 31557600000);
  if (age < 16) return 'U16';
  if (age < 18) return 'U18';
  if (age < 21) return 'U21';
  if (age >= 35) return 'MASTER';
  return 'ADULT';
}

export function inferWeightCategory(reg) {
  if (reg.weightCategory) return reg.weightCategory;
  const weight = Number(reg.weightVerified || reg.weightDeclared || 0);
  if (!weight) return 'OPEN';
  const limit = Math.ceil(weight / 5) * 5;
  return `-${limit}kg`;
}

function resolveBeltForDiscipline(athlete, discipline) {
  if (discipline === 'NEWAZA') return athlete.newazaBelt || athlete.belt || 'WHITE';
  return athlete.jiujitsuBelt || athlete.belt || 'WHITE';
}

export function enrichRegistrationFromAthlete(reg, athlete) {
  const enriched = { ...reg };
  if (!athlete) return enriched;

  const discipline = enriched.discipline || 'NEWAZA';
  enriched.firstName = athlete.firstName;
  enriched.lastName = athlete.lastName;
  enriched.gender = athlete.gender || enriched.gender;
  enriched.birthDate = athlete.birthDate || enriched.birthDate;
  enriched.clubId = enriched.clubId || athlete.club;
  enriched.licenseNumber = athlete.licenseNumber;
  enriched.licenseStatus = athlete.licenseStatus;
  enriched.weightDeclared = enriched.weightDeclared ?? athlete.weight;
  enriched.belt = resolveBeltForDiscipline(athlete, discipline);
  enriched.ageCategory = inferAgeCategory({ ...enriched, ageCategory: undefined });
  enriched.weightCategory = inferWeightCategory({ ...enriched, weightCategory: undefined });
  return enriched;
}

export function rederiveRegistrationCategories(reg) {
  const updated = { ...reg };
  updated.ageCategory = inferAgeCategory({ ...updated, ageCategory: undefined });
  updated.weightCategory = inferWeightCategory({ ...updated, weightCategory: undefined });
  return updated;
}

export function buildOfficialCategories(registrations, competition) {
  const map = new Map();
  for (const reg of registrations) {
    const beltGroup = normalizeBeltGroup(reg, competition);
    const discipline = reg.discipline || 'NEWAZA';
    const gender = reg.gender || 'MIXED';
    const ageCategory = inferAgeCategory(reg);
    const weightCategory = inferWeightCategory(reg);
    const key = [discipline, gender, ageCategory, weightCategory, beltGroup.label].join('|');
    if (!map.has(key)) {
      map.set(key, {
        name: `${discipline} ${gender} ${ageCategory} ${weightCategory} ${beltGroup.label}`,
        discipline,
        gender,
        ageCategory,
        weightCategory,
        beltGroup: beltGroup.label,
        belts: beltGroup.belts,
        registrations: [],
        athletes: [],
        warnings: []
      });
    }
    const category = map.get(key);
    category.registrations.push(reg._id);
    if (reg.athleteId) category.athletes.push(reg.athleteId);
  }
  return [...map.values()].map((category) => ({
    ...category,
    status: category.athletes.length < 2 ? 'needs_review' : 'generated',
    warnings: category.athletes.length < 2 ? ['Categorie avec moins de deux athletes: revue manuelle recommandee.'] : category.warnings
  }));
}
