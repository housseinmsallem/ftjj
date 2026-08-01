import type {
  StatItem,
  EventItem,
  NewsItem,
  PortalCard,
  ClubDirectoryEntry,
  Athlete,
  Coach,
  Referee,
} from "../types";

export interface FederationPillar {
  title: string;
  text: string;
}

export interface FederationTimelineItem {
  title: string;
  text: string;
}

export interface MediaShowcaseItem {
  title: string;
  tag: string;
  text: string;
  cta: string;
}

export interface ContactDetails {
  address: string;
  phone: string;
  email: string;
}

export interface DirectoryFallbacks {
  clubs: ClubDirectoryEntry[];
  athletes: Athlete[];
  coaches: Coach[];
  referees: Referee[];
}

export const fallbackStats: StatItem[] = [
  { value: "12,458", label: "Athletes licencies", icon: "AT" },
  { value: "152", label: "Clubs affilies", icon: "CL" },
  { value: "48", label: "Competitions / an", icon: "EV" },
  { value: "320", label: "Arbitres & coachs", icon: "OF" },
  { value: "Tunisie", label: "Membre de la JJIF", icon: "JJ" },
];

export const fallbackEvents: EventItem[] = [
  {
    id: "open-national",
    title: "Open National Jiu-Jitsu FTJJ 2026",
    location: "Salle Omnisports de Rades",
    city: "Rades - Tunis",
    startDate: "2026-06-15",
    endDate: "2026-06-16",
    badge: "Open National",
    ctaLabel: "Plus d'informations",
  },
  {
    id: "stage-national",
    title: "Stage National Ne-Waza",
    location: "Hammamet",
    city: "Hammamet",
    startDate: "2026-07-28",
    endDate: "2026-07-28",
    badge: "Stage federal",
    ctaLabel: "Voir le programme",
  },
  {
    id: "championnat-clubs",
    title: "Championnat des Clubs",
    location: "Sfax",
    city: "Sfax",
    startDate: "2026-08-10",
    endDate: "2026-08-10",
    badge: "Championnat",
    ctaLabel: "Consulter",
  },
];

export const fallbackNews: NewsItem[] = [
  {
    id: "news-africa",
    type: "NEWS",
    category: "Equipe nationale",
    title:
      "Un excellent parcours pour la Tunisie au Championnat d'Afrique 2026",
    excerpt:
      "Retour sur la performance des athletes tunisiens et les prochaines etapes de la saison.",
    publishedAt: "2026-05-12",
    audience: "1 248 vues",
  },
  {
    id: "news-calendar",
    type: "ANNOUNCEMENT",
    category: "Communique officiel",
    title: "Calendrier des competitions 2026",
    excerpt:
      "Toutes les dates majeures de la saison federale, des opens regionaux aux championnats nationaux.",
    publishedAt: "2026-05-08",
    audience: "804 vues",
  },
  {
    id: "news-referees",
    type: "NEWS",
    category: "Formation",
    title: "Formation des arbitres nationaux",
    excerpt:
      "Session de perfectionnement dediee aux arbitres designes pour les grandes competitions FTJJ.",
    publishedAt: "2026-05-05",
    audience: "532 vues",
  },
];

export const federationPillars: FederationPillar[] = [
  {
    title: "Gouvernance federale",
    text: "Pilotage central des clubs, licences, documents, paiements et validations dans un backoffice unique.",
  },
  {
    title: "Performance sportive",
    text: "Classements, competitions, suivi athletes, encadrement des coachs et coordination des arbitres.",
  },
  {
    title: "Services numeriques",
    text: "Affiliation en ligne, espaces prives, live scoring, contenu public et diffusion des informations officielles.",
  },
];

export const federationTimeline: FederationTimelineItem[] = [
  {
    title: "Affiliation club",
    text: "Le club depose sa demande, cree son compte prive puis soumet ses pieces administratives.",
  },
  {
    title: "Validation federale",
    text: "La Federation controle les informations, attribue les statuts et debloque les services prives.",
  },
  {
    title: "Exploitation sportive",
    text: "Le club gere ses athletes, ses licences, ses inscriptions et suit les competitions en direct.",
  },
];

export const federationServices: string[] = [
  "Gestion des licences et renouvellements",
  "Annuaire officiel clubs, athletes, coachs et arbitres",
  "Competitions, rankings et resultats publics",
  "Live scoring temps reel pour les tatamis",
  "Notifications et contenu public administres par la FTJJ",
  "Preparation multi-federation pour l'evolution SaaS",
];

export const mediaShowcase: MediaShowcaseItem[] = [
  {
    title: "Galeries photos competition",
    tag: "Photos",
    text: "Visuels editoriaux pour les opens, championnats et evenements nationaux.",
    cta: "/competitions",
  },
  {
    title: "Replay & live scoring",
    tag: "Live",
    text: "Suivi des combats, tableaux et diffusion des resultats en temps reel.",
    cta: "/en-direct",
  },
  {
    title: "Kit media FTJJ",
    tag: "Presse",
    text: "Elements de communication pour les clubs, partenaires et publications officielles.",
    cta: "/contact",
  },
];

export const portalCards: PortalCard[] = [
  {
    role: "Club / Association",
    title: "Espace Club",
    text: "Affiliation, licences, athletes, documents, competitions et paiements pour les structures affiliees.",
    actions: [
      { label: "Se connecter", to: "/login" },
      { label: "Demander une affiliation", to: "/affiliation" },
    ],
  },
  {
    role: "Athlete",
    title: "Espace licencie",
    text: "Suivi du profil sportif, licence annuelle, ranking, palmares et historique de competitions.",
    actions: [
      { label: "Acceder au portail", to: "/login" },
      { label: "Voir le ranking", to: "/ranking" },
    ],
  },
  {
    role: "Coach",
    title: "Espace encadrement",
    text: "Certifications, groupes suivis, stages federaux, suivi licences et coordination sportive.",
    actions: [
      { label: "Connexion coach", to: "/login" },
      { label: "Annuaire coachs", to: "/coaches" },
    ],
  },
  {
    role: "Arbitre",
    title: "Espace arbitrage",
    text: "Disponibilites, affectations, certifications, supervision live et calendrier des competitions.",
    actions: [
      { label: "Connexion arbitre", to: "/login" },
      { label: "Annuaire arbitres", to: "/referees" },
      { label: "Devenir arbitre", to: "/arbitre/inscription" },
    ],
  },
];

export const directoryFallbacks: DirectoryFallbacks = {
  clubs: [
    {
      _id: "club-tunis",
      name: "Club Tunis Jiu-Jitsu",
      governorate: "Tunis",
      address: "Complexe sportif El Menzah",
      president: "Sami Ben Hmida",
      email: "club.tunis@ftjj.tn",
      phone: "+216 71 555 100",
      affiliationStatus: "Affilie",
    },
    {
      _id: "club-sousse",
      name: "Club Sousse Newaza",
      governorate: "Sousse",
      address: "Salle omnisports de Sousse",
      president: "Marouen Hajri",
      email: "club.sousse@ftjj.tn",
      phone: "+216 73 555 101",
      affiliationStatus: "Affilie",
    },
    {
      _id: "club-sfax",
      name: "Academie Sfax Jiu-Jitsu",
      governorate: "Sfax",
      address: "Centre sportif route de l aeroport",
      president: "Ahmed Gharbi",
      email: "club.sfax@ftjj.tn",
      phone: "+216 74 555 102",
      affiliationStatus: "Affilie",
    },
  ],
  athletes: [
    {
      _id: "athlete-yassine",
      firstName: "Yassine",
      lastName: "Ghazouani",
      category: "Senior -69 kg",
      weight: 69,
      licenseNumber: "FTJJ-ATH-2026-001",
      licenseStatus: "Active",
      rankingPoints: 2450,
      jiujitsuBelt: "BLACK",
      jiujitsuBlackBeltDegree: 1,
      newazaBelt: "BROWN",
      achievements: ["Champion national 2025", "Selection equipe nationale"],
      club: { name: "Club Sousse Jiu-Jitsu" },
    },
    {
      _id: "athlete-mohamed",
      firstName: "Mohamed Amine",
      lastName: "Jlassi",
      category: "Senior -77 kg",
      weight: 77,
      licenseNumber: "FTJJ-ATH-2026-002",
      licenseStatus: "Active",
      rankingPoints: 2320,
      jiujitsuBelt: "PURPLE",
      newazaBelt: "BLUE",
      achievements: ["Vainqueur Open de Tunis"],
      club: { name: "Club Tunis Jiu-Jitsu" },
    },
    {
      _id: "athlete-anis",
      firstName: "Anis",
      lastName: "Ben Said",
      category: "Junior -62 kg",
      weight: 62,
      licenseNumber: "FTJJ-ATH-2026-003",
      licenseStatus: "Active",
      rankingPoints: 2150,
      jiujitsuBelt: "BROWN",
      newazaBelt: "PURPLE",
      achievements: ["Podium championnat national junior"],
      club: { name: "Academie Sfax Jiu-Jitsu" },
    },
  ],
  coaches: [
    {
      _id: "coach-1",
      name: "Walid Trabelsi",
      experienceYears: 12,
      specialties: ["Preparation competition", "Newaza"],
      certifications: ["Coach national A"],
      licenseStatus: "Active",
      club: { name: "Club Tunis Jiu-Jitsu" },
    },
    {
      _id: "coach-2",
      name: "Hatem Chaouachi",
      experienceYears: 9,
      specialties: ["Jiu-Jitsu fighting"],
      certifications: ["Coach national B"],
      licenseStatus: "Active",
      club: { name: "Club Sousse Jiu-Jitsu" },
    },
  ],
  referees: [
    {
      _id: "ref-1",
      name: "Rania Mansouri",
      level: "National",
      availability: true,
      certifications: ["Arbitre national"],
      events: ["Open FTJJ"],
    },
    {
      _id: "ref-2",
      name: "Nader Toumi",
      level: "Regional",
      availability: false,
      certifications: ["Arbitre regional"],
      events: [],
    },
  ],
};

export const contactDetails: ContactDetails = {
  address: "Cite Olympique El Menzah, Tunis, Tunisie",
  phone: "+216 71 123 456",
  email: "contact@ftjj.tn",
};
