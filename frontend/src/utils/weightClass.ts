// Weight categories for competition / license display
const MALE_CATEGORIES = [-56, -62, -69, -77, -85, -94, -120] as const;
const FEMALE_CATEGORIES = [-49, -55, -62, -70, -95] as const;

export function getWeightClass(weightKg: number | null | undefined, gender: "MALE" | "FEMALE" | string | null | undefined): string {
  if (weightKg == null || weightKg <= 0) return "N/A";

  const categories = gender === "FEMALE" ? FEMALE_CATEGORIES : MALE_CATEGORIES;

  for (const limit of categories) {
    const limitKg = Math.abs(limit);
    if (weightKg <= limitKg) {
      return `${limit}kg`;
    }
  }

  // Above the highest category
  const last = categories[categories.length - 1];
  return `+${Math.abs(last)}kg`;
}

export function getGenderLabel(gender: "MALE" | "FEMALE" | string | null | undefined): string {
  if (gender === "MALE") return "Homme";
  if (gender === "FEMALE") return "Femme";
  return "N/A";
}
