// User & Auth types
export type UserRole =
  | "SUPER_ADMIN"
  | "FEDERATION_ADMIN"
  | "ADMIN"
  | "COMPETITION_MANAGER"
  | "MEDIA_MANAGER"
  | "CLUB_ADMIN"
  | "CLUB_OWNER"
  | "ATHLETE"
  | "COACH"
  | "REFEREE";

export interface User {
  _id: string;
  id?: string;
  email: string;
  role: UserRole;
  isApproved?: boolean;
  firstName?: string;
  lastName?: string;
  club?: ClubRef;
  createdAt?: string;
}

export interface ClubRef {
  _id?: string;
  id?: string;
  name: string;
  shortName?: string;
  ownerId?: string;
  address?: string;
  governorate?: string;
}

// Person types
export type PersonType = "ATHLETE" | "COACH" | "REFEREE" | "TECHNICIAN";

export interface Athlete {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: "MALE" | "FEMALE";
  photoUrl?: string;
  grade?: string;
  belt?: string;
  jiujitsuBelt?: string;
  jiujitsuBlackBeltDegree?: number;
  jiujitsuGrade?: string;
  newazaBelt?: string;
  newazaBlackBeltDegree?: number;
  newazaGrade?: string;
  weight?: number;
  category?: string;
  licenseNumber?: string;
  licenseStatus?: string;
  rankingPoints?: number;
  achievements?: string[];
  club?: ClubRef;
  type?: PersonType;
}

export interface Coach {
  _id: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  experienceYears?: number;
  specialties?: string[];
  certifications?: string[];
  licenseStatus?: string;
  club?: ClubRef;
  type?: PersonType;
}

export interface Referee {
  _id: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  level?: string;
  availability?: boolean;
  certifications?: string[];
  events?: string[];
  club?: ClubRef;
  type?: PersonType;
}

export interface Person {
  _id: string;
  id?: string;
  code?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality?: string;
  gender: "MALE" | "FEMALE";
  photoUrl?: string;
  identityDocumentType?: "CIN" | "BIRTH_CERTIFICATE";
  identityDocumentUrl?: string;
  type: PersonType;
  clubId?: string;
  club?: ClubRef;
  grade?: string;
  birthCertificateUrl?: string;
  achievements?: string[];
  athleteDetails?: {
    grade?: string | null;
    weight?: number | null;
  } | null;
}

// Competition types
export interface Competition {
  _id: string;
  id?: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  status?: string;
  type?: string;
  splitByBelt?: boolean;
  ageDivision?: string;
  ageDivisions?: string[];
  seasonYear?: number;
  posterUrl?: string;
  _count?: { signups?: number; matches?: number };
}

export interface CompetitionSignup {
  _id: string;
  competitionId: string;
  personId: string;
  person?: Person;
  type: PersonType;
  paymentReceiptUrl?: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
}

// License types
export interface License {
  _id: string;
  id?: string;
  personId: string;
  person?: Person;
  licenseType: string;
  issuedAt: string;
  expiryDate: string;
  isActive: boolean;
  paymentReceiptUrl?: string;
  validatedByAdmin?: boolean;
}

// Registration types
export interface RegistrationRequest {
  _id: string;
  id?: string;
  clubId: string;
  personId?: string;
  person?: Person;
  licenseType: string;
  paymentReceiptUrl?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment?: string;
  createdAt: string;
}

// Match / Scoring types
export interface Match {
  _id: string;
  id?: string;
  competitionId: string;
  competition?: Competition;
  redCornerId: string;
  redCorner?: Person;
  blueCornerId: string;
  blueCorner?: Person;
  redScore: number;
  blueScore: number;
  warningsRed: number;
  penaltiesRed: number;
  warningsBlue: number;
  penaltiesBlue: number;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  matNumber: number;
  winnerSide?: string;
  winMethod?: string;
}

export interface ScoringSession {
  _id: string;
  matchId?: string;
  status: string;
  timerState: string;
  remainingSeconds: number;
  red: ScoreState;
  blue: ScoreState;
  discipline: string;
  category: string;
  mat: string;
  round: string;
  winnerSide: string | null;
  winMethod: string | null;
  fight?: {
    redAthlete?: Person;
    blueAthlete?: Person;
  };
  competition?: Competition;
  controlledBy?: string | { _id: string };
}

export interface ScoreState {
  score: number;
  advantages: number;
  penalties: number;
  warnings: number;
}

export interface ScoreAction {
  side: "red" | "blue";
  type: string;
  value?: number;
  reason?: string;
}

// Pricing
export interface Pricing {
  _id: string;
  id?: string;
  name: string;
  amount: number;
  category: "LICENSE" | "STAGE" | "PASSAGE_GRADE" | "COMPETITION";
}

// Dashboard
export interface DashboardStats {
  users?: number;
  clubs?: number;
  persons?: {
    total: number;
    athletes: number;
    coaches: number;
    referees: number;
    technicians: number;
  };
  licenses?: { active: number };
  registrations?: { pending: number };
  competitions?: { total: number; liveMatches: number };
}

// API Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  statusCode?: number;
  errors?: string[];
}

// Auth
export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// Public content
export interface StatItem {
  value: string;
  label: string;
  icon: string;
}

export interface EventItem {
  id: string;
  title: string;
  location: string;
  city: string;
  startDate: string;
  endDate: string;
  badge: string;
  ctaLabel: string;
}

export interface NewsItem {
  id: string;
  type: string;
  category: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  audience: string;
}

export interface PortalCard {
  role: string;
  title: string;
  text: string;
  actions: { label: string; to: string }[];
}

export interface ClubDirectoryEntry {
  _id: string;
  name: string;
  governorate: string;
  address: string;
  president: string;
  email: string;
  phone: string;
  affiliationStatus: string;
}

// Component Props
export interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}
