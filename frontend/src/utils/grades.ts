export interface BeltOption {
  value: string;
  label: string;
}

export const BELT_OPTIONS: BeltOption[] = [
  { value: "WHITE", label: "Blanche" },
  { value: "BLUE", label: "Bleue" },
  { value: "PURPLE", label: "Violette" },
  { value: "BROWN", label: "Marron" },
  { value: "BLACK", label: "Noire" },
];

const beltLabels: Record<string, string> = BELT_OPTIONS.reduce(
  (accumulator: Record<string, string>, option: BeltOption) => {
    accumulator[option.value] = option.label;
    return accumulator;
  },
  {},
);

export interface AthleteGrade {
  belt?: string;
  jiujitsuBelt?: string;
  jiujitsuBlackBeltDegree?: number;
  jiujitsuGrade?: string;
  newazaBelt?: string;
  newazaBlackBeltDegree?: number;
  newazaGrade?: string;
  blackBeltDegree?: number;
}

export function formatBlackBeltDegree(value: number | string | undefined): string {
  const degree = Number(value);
  if (!Number.isFinite(degree) || degree <= 0) return "";
  return degree === 1 ? "1er degre" : `${degree}e degre`;
}

export function formatBeltLabel(value: string | undefined): string {
  if (!value) return "Non renseigne";
  return beltLabels[value] || value;
}

export function formatDisciplineGrade(
  belt: string | undefined,
  degree: number | string | undefined,
): string {
  const beltLabel = formatBeltLabel(belt);
  if (!belt) return beltLabel;
  if (belt === "BLACK" && degree) {
    return `${beltLabel} - ${formatBlackBeltDegree(degree)}`;
  }
  return beltLabel;
}

export function formatJiuJitsuGrade(athlete: AthleteGrade = {}): string {
  if (athlete.jiujitsuGrade) return athlete.jiujitsuGrade;
  return formatDisciplineGrade(
    athlete.jiujitsuBelt || athlete.belt,
    athlete.jiujitsuBlackBeltDegree || athlete.blackBeltDegree,
  );
}

export function formatNewazaGrade(athlete: AthleteGrade = {}): string {
  if (athlete.newazaGrade) return athlete.newazaGrade;
  return formatDisciplineGrade(
    athlete.newazaBelt,
    athlete.newazaBlackBeltDegree,
  );
}

export function formatAthleteTechnicalGrades(athlete: AthleteGrade = {}): string {
  const parts: string[] = [];
  const jiuJitsuGrade = formatJiuJitsuGrade(athlete);
  const newazaGrade = formatNewazaGrade(athlete);

  if (jiuJitsuGrade && jiuJitsuGrade !== "Non renseigne")
    parts.push(`Jiu-Jitsu: ${jiuJitsuGrade}`);
  if (newazaGrade && newazaGrade !== "Non renseigne")
    parts.push(`Newaza: ${newazaGrade}`);

  return parts.length ? parts.join(" | ") : "Non renseigne";
}

export function formatAthleteTechnicalGrade(athlete: AthleteGrade = {}): string {
  return formatJiuJitsuGrade(athlete);
}
