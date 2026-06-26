export function inferAgeCategoryFromBirthDate(birthDate) {
  if (!birthDate) return "ADULT";
  const age = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / 31557600000,
  );
  if (age < 16) return "U16";
  if (age < 18) return "U18";
  if (age < 21) return "U21";
  if (age >= 35) return "MASTER";
  return "ADULT";
}

export function inferWeightCategoryFromWeight(weight) {
  const value = Number(weight);
  if (!value) return "OPEN";
  const limit = Math.ceil(value / 5) * 5;
  return `-${limit}kg`;
}

export function resolveBeltForDiscipline(athlete, discipline) {
  if (!athlete) return "WHITE";
  if (discipline === "NEWAZA") {
    return athlete.newazaBelt || athlete.belt || "WHITE";
  }
  return athlete.jiujitsuBelt || athlete.belt || "WHITE";
}

export function previewRegistrationFields(athlete, discipline, weightOverride) {
  const weight = weightOverride ?? athlete?.weight;
  return {
    belt: resolveBeltForDiscipline(athlete, discipline),
    ageCategory: inferAgeCategoryFromBirthDate(athlete?.birthDate),
    weightCategory: inferWeightCategoryFromWeight(weight),
    weightDeclared: weight,
  };
}
