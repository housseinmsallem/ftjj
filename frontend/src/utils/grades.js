export const BELT_OPTIONS = [
  { value: "WHITE", label: "Blanche" },
  { value: "BLUE", label: "Bleue" },
  { value: "PURPLE", label: "Violette" },
  { value: "BROWN", label: "Marron" },
  { value: "BLACK", label: "Noire" },
];

const beltLabels = BELT_OPTIONS.reduce((accumulator, option) => {
  accumulator[option.value] = option.label;
  return accumulator;
}, {});

export function formatBlackBeltDegree(value) {
  const degree = Number(value);
  if (!Number.isFinite(degree) || degree <= 0) return "";
  return degree === 1 ? "1er degre" : `${degree}e degre`;
}

export function formatBeltLabel(value) {
  if (!value) return "Non renseigne";
  return beltLabels[value] || value;
}

export function formatDisciplineGrade(belt, degree) {
  const beltLabel = formatBeltLabel(belt);
  if (!belt) return beltLabel;
  if (belt === "BLACK" && degree) {
    return `${beltLabel} - ${formatBlackBeltDegree(degree)}`;
  }
  return beltLabel;
}

export function formatJiuJitsuGrade(athlete = {}) {
  if (athlete.jiujitsuGrade) return athlete.jiujitsuGrade;
  return formatDisciplineGrade(
    athlete.jiujitsuBelt || athlete.belt,
    athlete.jiujitsuBlackBeltDegree || athlete.blackBeltDegree,
  );
}

export function formatNewazaGrade(athlete = {}) {
  if (athlete.newazaGrade) return athlete.newazaGrade;
  return formatDisciplineGrade(
    athlete.newazaBelt,
    athlete.newazaBlackBeltDegree,
  );
}

export function formatAthleteTechnicalGrades(athlete = {}) {
  const parts = [];
  const jiuJitsuGrade = formatJiuJitsuGrade(athlete);
  const newazaGrade = formatNewazaGrade(athlete);

  if (jiuJitsuGrade && jiuJitsuGrade !== "Non renseigne")
    parts.push(`Jiu-Jitsu: ${jiuJitsuGrade}`);
  if (newazaGrade && newazaGrade !== "Non renseigne")
    parts.push(`Newaza: ${newazaGrade}`);

  return parts.length ? parts.join(" | ") : "Non renseigne";
}

export function formatAthleteTechnicalGrade(athlete = {}) {
  return formatJiuJitsuGrade(athlete);
}
