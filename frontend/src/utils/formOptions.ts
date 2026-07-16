// Age divisions for competitions (matches backend AgeDivision enum)
export const AGE_DIVISIONS: { value: string; label: string }[] = [
  { value: "U6", label: "U6 (4-5 ans)" },
  { value: "U8", label: "U8 (6-7 ans)" },
  { value: "U10", label: "U10 (8-9 ans)" },
  { value: "U12", label: "U12 (10-11 ans)" },
  { value: "U14", label: "U14 (12-13 ans)" },
  { value: "U16", label: "U16 (14-15 ans)" },
  { value: "U18", label: "U18 (16-17 ans)" },
  { value: "U21", label: "U21 (18-20 ans)" },
  { value: "ADULTS", label: "Adultes (18+)" },
  { value: "MASTERS_1", label: "Masters 1 (35-39 ans)" },
  { value: "MASTERS_2", label: "Masters 2 (40-44 ans)" },
  { value: "MASTERS_3", label: "Masters 3 (45-49 ans)" },
  { value: "MASTERS_4", label: "Masters 4 (50+)" },
];

export function getAgeDivisionLabel(value: string): string {
  return AGE_DIVISIONS.find((d) => d.value === value)?.label || value;
}

// Male weight categories per age division
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

export function getWeightCategories(ageDivision: string, gender: string): string[] {
  const cats = gender === "FEMALE" ? (FEMALE_WEIGHT[ageDivision] || []) : (MALE_WEIGHT[ageDivision] || []);
  if (cats.length === 0) return ["OPEN"];
  const result = cats.map((l) => `-${l}kg`);
  result.push(`+${cats[cats.length - 1]}kg`);
  return result;
}

// Shared French country list for nationality selects
export const COUNTRIES: string[] = [
  "Afghane", "Albanaise", "Algérienne", "Allemande", "Américaine", "Andorrane",
  "Angolaise", "Argentine", "Arménienne", "Australienne", "Autrichienne",
  "Bahreïnie", "Bangladeshi", "Belge", "Béninoise", "Brésilienne", "Britannique",
  "Bulgare", "Burkinabée", "Burundaise", "Camerounaise", "Canadienne",
  "Cap-verdienne", "Chilienne", "Chinoise", "Chypriote", "Colombienne",
  "Congolaise", "Coréenne", "Croate", "Cubaine", "Danoise", "Djiboutienne",
  "Égyptienne", "Émiratie", "Équatorienne", "Espagnole", "Estonienne",
  "Éthiopienne", "Finlandaise", "Française", "Gabonaise", "Ghanéenne",
  "Grecque", "Guinéenne", "Haïtienne", "Hongroise", "Indienne", "Indonésienne",
  "Irakienne", "Iranienne", "Irlandaise", "Islandaise", "Israélienne",
  "Italienne", "Ivoirienne", "Jamaïcaine", "Japonaise", "Jordanienne",
  "Kazakhe", "Kényane", "Koweïtienne", "Libanaise", "Libyenne",
  "Luxembourgeoise", "Malaisienne", "Malienne", "Maltaise", "Marocaine",
  "Mauritanienne", "Mexicaine", "Nigériane", "Nigérienne", "Norvégienne",
  "Néo-zélandaise", "Omanaise", "Ougandaise", "Pakistanaise",
  "Palestinienne", "Néerlandaise", "Péruvienne", "Philippine", "Polonaise",
  "Portugaise", "Qatarie", "Roumaine", "Russe", "Rwandaise", "Sénégalaise",
  "Serbe", "Slovaque", "Slovène", "Somalienne", "Soudanaise", "Sud-africaine",
  "Suédoise", "Suisse", "Syrienne", "Tchadienne", "Tchèque", "Thaïlandaise",
  "Togolaise", "Tunisienne", "Turque", "Ukrainienne", "Uruguayenne",
  "Vénézuélienne", "Vietnamienne", "Yéménite", "Zambienne"
];

// Newaza belt/grade options
export interface GradeOption {
  value: string;
  label: string;
  belt: string; // WHITE, BLUE, PURPLE, BROWN, BLACK
  degree: number; // 0 for non-black, 1-6 for black
}

export const NEWAZA_GRADES: GradeOption[] = [
  { value: "WHITE", label: "Ceinture Blanche", belt: "WHITE", degree: 0 },
  { value: "BLUE", label: "Ceinture Bleue", belt: "BLUE", degree: 0 },
  { value: "PURPLE", label: "Ceinture Violette", belt: "PURPLE", degree: 0 },
  { value: "BROWN", label: "Ceinture Marron", belt: "BROWN", degree: 0 },
  { value: "BLACK_1", label: "Ceinture Noire 1er Degré", belt: "BLACK", degree: 1 },
  { value: "BLACK_2", label: "Ceinture Noire 2ème Degré", belt: "BLACK", degree: 2 },
  { value: "BLACK_3", label: "Ceinture Noire 3ème Degré", belt: "BLACK", degree: 3 },
  { value: "BLACK_4", label: "Ceinture Noire 4ème Degré", belt: "BLACK", degree: 4 },
  { value: "BLACK_5", label: "Ceinture Noire 5ème Degré", belt: "BLACK", degree: 5 },
  { value: "BLACK_6", label: "Ceinture Noire 6ème Degré", belt: "BLACK", degree: 6 },
];

// Filtered grade lists per role
// Athletes: all grades (White → Black 6)
// Coaches: Purple → Black 6
// Referees: Blue → Black 6
// Technicians: all grades (no restriction)

export function getGradesForRole(role: "ATHLETE" | "COACH" | "REFEREE" | "TECHNICIAN"): GradeOption[] {
  switch (role) {
    case "COACH":
      return NEWAZA_GRADES.filter(g => g.belt === "BLACK" || g.belt === "BROWN" || g.belt === "PURPLE");
    case "REFEREE":
      return NEWAZA_GRADES.filter(g => g.belt === "BLACK" || g.belt === "BROWN" || g.belt === "PURPLE" || g.belt === "BLUE");
    case "ATHLETE":
    case "TECHNICIAN":
    default:
      return NEWAZA_GRADES;
  }
}
