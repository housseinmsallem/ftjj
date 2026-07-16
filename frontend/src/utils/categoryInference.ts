export type AgeCategory = "U16" | "U18" | "U21" | "ADULT" | "MASTER";
export type WeightCategory = `-${number}kg` | "OPEN";

export interface AthleteParam {
  weight?: number;
  birthDate?: string;
  belt?: string;
  jiujitsuBelt?: string;
  newazaBelt?: string;
}

export interface RegistrationPreview {
  belt: string;
  ageCategory: AgeCategory;
  weightCategory: WeightCategory;
  weightDeclared: number | undefined;
}

export function inferAgeCategoryFromBirthDate(birthDate: string | undefined | null): AgeCategory {
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

export function inferWeightCategoryFromWeight(weight: number | undefined | null): WeightCategory {
  const value = Number(weight);
  if (!value) return "OPEN";
  const limit = Math.ceil(value / 5) * 5;
  return `-${limit}kg`;
}

export function resolveBeltForDiscipline(
  athlete: AthleteParam | null | undefined,
  discipline: string | undefined,
): string {
  if (!athlete) return "WHITE";
  if (discipline === "NEWAZA") {
    return athlete.newazaBelt || athlete.belt || "WHITE";
  }
  return athlete.jiujitsuBelt || athlete.belt || "WHITE";
}

export function previewRegistrationFields(
  athlete: AthleteParam | null | undefined,
  discipline: string | undefined,
  weightOverride?: number,
): RegistrationPreview {
  const weight = weightOverride ?? athlete?.weight;
  return {
    belt: resolveBeltForDiscipline(athlete, discipline),
    ageCategory: inferAgeCategoryFromBirthDate(athlete?.birthDate),
    weightCategory: inferWeightCategoryFromWeight(weight),
    weightDeclared: weight,
  };
}
