import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RegistrationStatus, PersonType } from "@prisma/client";
import {
  AgeDivision,
  getWeightCategory,
  getWeightCategories,
  getBeltGroup,
  getCurrentSeasonYear,
  getAgeDivision,
  getAgeDivisionLabel,
  getNextHigherAgeDivision,
  getNextHigherWeightCategory,
  getNextHigherBelt,
} from "../../common/utils/age-division";

@Injectable()
export class CompetitionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const competitions = await this.prisma.competition.findMany({
      include: {
        _count: { select: { signups: true, matches: true } },
      },
      orderBy: { date: "desc" },
    });
    return { data: competitions.map(c => ({ ...c, isRegistrationOpen: this.computeIsRegistrationOpen(c.date) })) };
  }

  async findOne(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        documents: true,
        mats: { include: { _count: { select: { matches: true } } }, orderBy: { number: 'asc' } },
        signups: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                type: true,
                gender: true,
                club: { select: { id: true, name: true } },
                athleteDetails: { select: { grade: true, weight: true } },
              },
            },
          },
        },
        matches: {
          include: {
            redCorner: {
              select: { id: true, firstName: true, lastName: true },
            },
            blueCorner: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "asc" }
        },
      },
    });

    if (!competition) {
      throw new NotFoundException("Compétition non trouvée");
    }

    return { data: { ...competition, isRegistrationOpen: this.computeIsRegistrationOpen(competition.date) } };
  }

  async create(data: {
    name: string;
    date: string;
    location?: string;
    description?: string;
    type?: string;
    splitByBelt?: boolean;
    ageDivisions?: string[];
    seasonYear?: number;
    posterUrl?: string;
  }) {
    const competition = await this.prisma.competition.create({
      data: {
        name: data.name,
        date: new Date(data.date),
        location: data.location || null,
        description: data.description || null,
        type: data.type || "Open",
        splitByBelt: data.splitByBelt || false,
        ageDivisions: data.ageDivisions || ["ADULTS"],
        seasonYear: data.seasonYear || 2026,
        posterUrl: data.posterUrl || null,
      },
    });

    // Auto-generate 4 default mats
    await Promise.all([1, 2, 3, 4].map((n) =>
      this.prisma.mat.create({
        data: { competitionId: competition.id, name: `Tapis ${n}`, number: n },
      }),
    ));

    return { message: "Compétition créée avec succès", data: competition };
  }

  async update(
    id: string,
    data: {
      name?: string;
      date?: string;
      location?: string;
      description?: string;
      type?: string;
      splitByBelt?: boolean;
      ageDivisions?: string[];
      seasonYear?: number;
      posterUrl?: string;
    },
  ) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });
    if (!competition) {
      throw new NotFoundException("Compétition non trouvée");
    }

    const updated = await this.prisma.competition.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.splitByBelt !== undefined && {
          splitByBelt: data.splitByBelt,
        }),
        ...(data.ageDivisions !== undefined && { ageDivisions: data.ageDivisions }),
        ...(data.seasonYear !== undefined && {
          seasonYear: data.seasonYear,
        }),
        ...(data.posterUrl !== undefined && { posterUrl: data.posterUrl }),
      },
    });

    return { message: "Compétition mise à jour avec succès", data: updated };
  }

  async delete(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });
    if (!competition) {
      throw new NotFoundException("Compétition non trouvée");
    }

    await this.prisma.competition.delete({ where: { id } });
    return { message: "Compétition supprimée avec succès" };
  }

  async signup(data: {
    competitionId: string;
    personId: string;
    type: PersonType;
    weight?: number;
    paymentReceiptUrl?: string;
  }, user?: { id: string; role: string }) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: data.competitionId },
    });
    if (!competition) {
      throw new NotFoundException("Compétition non trouvée");
    }

    if (user && user.role !== 'ADMIN' && !this.computeIsRegistrationOpen(competition.date)) {
      throw new BadRequestException(
        "Les inscriptions sont fermées (2 jours avant la compétition). Vous ne pouvez plus inscrire d'athlètes.",
      );
    }

    const person = await this.prisma.person.findUnique({
      where: { id: data.personId },
      include: { athleteDetails: true },
    });
    if (!person) {
      throw new NotFoundException("Personne non trouvée");
    }

    // Check license type for Championship competitions
    if (competition.type === "Championship") {
      const license = await this.prisma.license.findFirst({ where: { personId: data.personId, isActive: true } });
      if (license && license.licenseType === "B") {
        throw new BadRequestException(
          "Les athlètes avec une licence de type B ne peuvent participer qu'aux compétitions Open. Veuillez fournir un document d'autorisation de transfert pour obtenir une licence de type A."
        );
      }
    }

    // Validate age division for ATHLETE type
    if (data.type === PersonType.ATHLETE && person.athleteDetails) {
      const birthYear = person.dateOfBirth.getFullYear();
      const athleteDivision = getAgeDivision(birthYear, competition.seasonYear, competition.date);
      const allowedDivisions = competition.ageDivisions || [];
      if (allowedDivisions.length > 0 && !allowedDivisions.includes(athleteDivision)) {
        throw new BadRequestException(
          `L'athlète est dans la division ${getAgeDivisionLabel(athleteDivision)} mais la compétition n'accepte pas cette division.`,
        );
      }
    }

    // Check for duplicate signup
    const existing = await this.prisma.competitionSignup.findFirst({
      where: {
        competitionId: data.competitionId,
        personId: data.personId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        "Cette personne est déjà inscrite à cette compétition",
      );
    }

    const signup = await this.prisma.competitionSignup.create({
      data: {
        competitionId: data.competitionId,
        personId: data.personId,
        type: data.type,
        weight: data.weight || null,
        paymentReceiptUrl: data.paymentReceiptUrl,
        status: RegistrationStatus.PENDING,
      },
    });

    return {
      message: "Inscription à la compétition soumise avec succès",
      data: signup,
    };
  }

  async updateSignupStatus(signupId: string, status: RegistrationStatus) {
    const signup = await this.prisma.competitionSignup.findUnique({
      where: { id: signupId },
    });
    if (!signup) {
      throw new NotFoundException("Inscription non trouvée");
    }

    const updated = await this.prisma.competitionSignup.update({
      where: { id: signupId },
      data: { status },
    });

    return { message: "Statut de l'inscription mis à jour", data: updated };
  }

  async updateSignupWeight(signupId: string, weight: number) {
    const signup = await this.prisma.competitionSignup.findUnique({ where: { id: signupId } });
    if (!signup) throw new NotFoundException("Inscription non trouvée");
    const updated = await this.prisma.competitionSignup.update({
      where: { id: signupId },
      data: { weight },
    });
    return { message: "Poids mis à jour", data: updated };
  }

  async addDocument(competitionId: string, fileName: string, fileUrl: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });
    if (!competition) throw new NotFoundException("Compétition non trouvée");
    const doc = await this.prisma.competitionDocument.create({
      data: { competitionId, fileName, fileUrl },
    });
    return { message: "Document ajouté", data: doc };
  }

  async removeDocument(documentId: string) {
    const doc = await this.prisma.competitionDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException("Document non trouvé");
    await this.prisma.competitionDocument.delete({ where: { id: documentId } });
    return { message: "Document supprimé" };
  }

  /**
   * Shuffle athletes so same-club matchups are minimized in round 1.
   * Strategy: group athletes by club, then interleave them round-robin style.
   */
  private shuffleByClub(athletes: any[]): any[] {
    if (athletes.length <= 2) return [...athletes];
    const byClub: Record<string, any[]> = {};
    for (const a of athletes) {
      const clubId = a.person?.clubId || a.clubId || '_none';
      if (!byClub[clubId]) byClub[clubId] = [];
      byClub[clubId].push(a);
    }
    const clubs = Object.values(byClub);
    if (clubs.length === 1) {
      return [...athletes].sort(() => Math.random() - 0.5);
    }
    clubs.sort((a, b) => b.length - a.length);
    const result: any[] = [];
    let added = 0;
    while (added < athletes.length) {
      for (const club of clubs) {
        if (club.length > 0) {
          result.push(club.shift()!);
          added++;
        }
      }
    }
    return result;
  }

  private buildCategories(signups: any[], compAgeDivisions: string[], isIBJJF: boolean, seasonYear: number, competitionDate: Date): { categories: { name: string; athletes: string[] }[]; promotedCount: number } {
    const cats: { name: string; athletes: string[]; ageDiv: string; gender: string; weightCat: string; belt?: string }[] = [];
    if (signups.length === 0) return { categories: [], promotedCount: 0 };

    const byAge: Record<string, typeof signups> = {};
    for (const s of signups) {
      const ageDiv = getAgeDivision(new Date(s.person.dateOfBirth).getFullYear(), seasonYear, competitionDate);
      if (compAgeDivisions.length === 0 || compAgeDivisions.includes(ageDiv)) {
        if (!byAge[ageDiv]) byAge[ageDiv] = [];
        byAge[ageDiv].push(s);
      }
    }
    for (const [ageDiv, adAthletes] of Object.entries(byAge)) {
      const byGender: Record<string, typeof signups> = {};
      for (const s of adAthletes) { const g = s.person.gender || 'MALE'; if (!byGender[g]) byGender[g] = []; byGender[g].push(s); }
      for (const [gender, athletes] of Object.entries(byGender)) {
        const byWeight: Record<string, typeof signups> = {};
        for (const a of athletes) {
          const wc = getWeightCategory(a.weight ?? a.person.athleteDetails?.weight, gender, ageDiv);
          if (!byWeight[wc]) byWeight[wc] = []; byWeight[wc].push(a);
        }
        for (const [wc, wAthletes] of Object.entries(byWeight)) {
          if (isIBJJF) {
            const byBelt: Record<string, typeof signups> = {};
            for (const a of wAthletes) {
              const belt = getBeltGroup(a.person.athleteDetails?.grade || 'WHITE');
              if (!byBelt[belt]) byBelt[belt] = []; byBelt[belt].push(a);
            }
            for (const [belt, bAthletes] of Object.entries(byBelt)) {
              cats.push({ name: `${getAgeDivisionLabel(ageDiv as any)} ${gender === 'MALE' ? 'Hommes' : 'Femmes'} ${wc} - ${belt}`, athletes: bAthletes.map((a: any) => a.personId), ageDiv, gender, weightCat: wc, belt });
            }
          } else {
            cats.push({ name: `${getAgeDivisionLabel(ageDiv as any)} ${gender === 'MALE' ? 'Hommes' : 'Femmes'} ${wc}`, athletes: wAthletes.map((a: any) => a.personId), ageDiv, gender, weightCat: wc });
          }
        }
      }
    }

    const promoted = new Set<string>(); let changed = true;
    while (changed) {
      changed = false;
      for (const cat of cats) {
        if (cat.athletes.length >= 2 || cat.athletes.length === 0) continue;
        const loneId = cat.athletes[0]; if (promoted.has(loneId)) continue;
        let ok = false;
        const nw = getNextHigherWeightCategory(cat.weightCat, cat.gender, cat.ageDiv);
        if (nw && !ok) { const t = cats.find(c => c.ageDiv === cat.ageDiv && c.gender === cat.gender && c.weightCat === nw && (isIBJJF ? c.belt === cat.belt : true) && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } }
        if (!ok) { const na = getNextHigherAgeDivision(cat.ageDiv as AgeDivision); if (na && (compAgeDivisions.length === 0 || compAgeDivisions.includes(na))) { const t = cats.find(c => c.ageDiv === na && c.gender === cat.gender && c.weightCat === cat.weightCat && (isIBJJF ? c.belt === cat.belt : true) && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } } }
        if (!ok) { const na = getNextHigherAgeDivision(cat.ageDiv as AgeDivision); const nw2 = getNextHigherWeightCategory(cat.weightCat, cat.gender, cat.ageDiv); if (na && nw2 && (compAgeDivisions.length === 0 || compAgeDivisions.includes(na))) { const t = cats.find(c => c.ageDiv === na && c.gender === cat.gender && c.weightCat === nw2 && (isIBJJF ? c.belt === cat.belt : true) && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } } }
        if (!ok && isIBJJF && cat.belt) { const nb = getNextHigherBelt(cat.belt); if (nb) { const t = cats.find(c => c.ageDiv === cat.ageDiv && c.gender === cat.gender && c.weightCat === cat.weightCat && c.belt === nb && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } } }
      }
    }
    return { categories: cats.filter(c => c.athletes.length > 0).map(c => ({ name: c.name, athletes: c.athletes })), promotedCount: promoted.size };
  }

  async generateBrackets(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) throw new NotFoundException("Compétition non trouvée");

    const signups = (await this.prisma.competitionSignup.findMany({
      where: { competitionId, status: "APPROVED" as any, type: "ATHLETE" },
      include: { person: { include: { athleteDetails: true, club: true } } },
    })) as any[];

    if (signups.length === 0) {
      throw new BadRequestException("Aucun athlète confirmé trouvé pour générer les brackets");
    }

    const isIBJJF = competition.splitByBelt === true;
    const seasonYear = competition.seasonYear || 2026;
    // Pass empty ageDivisions array so ALL approved athletes are included.
    // The competition.ageDivisions field filters registration, not bracket generation.
    const result = this.buildCategories(signups, [], isIBJJF, seasonYear, competition.date);

    return {
      data: {
        competitionId,
        splitByBelt: competition.splitByBelt,
        ageDivisions: competition.ageDivisions,
        categories: result.categories,
        totalAthletes: signups.length,
        promotedAthletes: result.promotedCount,
      },
    };
  }

  /**
   * Seeds athletes into first-round matches, avoiding conflicts by priority:
   * 1. Champions never face each other
   * 2. Same-team members never face each other
   * 3. Same-club members never face each other
   * Returns an array of matches: [{ red: id|null, blue: id|null }]
   * A null corner means a bye (odd number of athletes).
   */
  private seedFirstRound(athletes: Array<{ id: string; weight: number; isFormerChampion: boolean; clubId?: string; teamIds: string[] }>): Array<{ red: string | null; blue: string | null }> {
    const n = athletes.length;
    if (n < 2) return [];

    const numMatches = Math.floor(n / 2);
    const hasBye = n % 2 === 1;

    // Separate champions
    const sorted = [...athletes].sort((a, b) => a.weight - b.weight);
    const champions = sorted.filter(a => a.isFormerChampion);
    const others = sorted.filter(a => !a.isFormerChampion);

    const matches: Array<{ red: string | null; blue: string | null }> = [];
    const used = new Set<string>();

    // Helper: check if two athletes conflict (same club or same team)
    const hasConflict = (a: typeof athletes[0], b: typeof athletes[0]) =>
      (a.clubId && b.clubId && a.clubId === b.clubId) ||
      a.teamIds.some(t => b.teamIds.includes(t));

    // Place champions first — each in a different match, paired with a non-champion
    for (const champ of champions) {
      // Find the best opponent: a non-champion, no conflict, similar weight
      let bestOpp: typeof athletes[0] | null = null;
      for (const opp of others) {
        if (used.has(opp.id)) continue;
        if (!hasConflict(champ, opp)) {
          if (!bestOpp || Math.abs(opp.weight - champ.weight) < Math.abs(bestOpp.weight - champ.weight)) {
            bestOpp = opp;
          }
        }
      }
      if (bestOpp) {
        used.add(champ.id);
        used.add(bestOpp.id);
        matches.push({ red: champ.id, blue: bestOpp.id });
      } else {
        // No suitable non-champion — place champion alone, they'll get a bye
        // or be paired with another champion as last resort
        used.add(champ.id);
      }
    }

    // Collect unpaired champions
    const unpairedChamps = champions.filter(c => used.has(c.id) && !matches.some(m => m.red === c.id || m.blue === c.id));
    // Re-add to pool: remove from used so they can be paired below
    for (const c of unpairedChamps) used.delete(c.id);

    // Place remaining athletes into matches, avoiding champion-vs-champion
    const remaining = sorted.filter(a => !used.has(a.id));
    while (remaining.length >= 2 && matches.length < numMatches) {
      const a = remaining.shift()!;
      const aIsChamp = a.isFormerChampion;
      // Find best opponent: avoid champion-vs-champion, club conflict, team conflict
      let bestIdx = -1;
      for (let i = 0; i < remaining.length; i++) {
        const b = remaining[i];
        // Never pair two champions together
        if (aIsChamp && b.isFormerChampion) continue;
        if (!hasConflict(a, b)) {
          bestIdx = i;
          break;
        }
      }
      // If no ideal opponent found, fall back to any non-champion
      if (bestIdx === -1 && aIsChamp) {
        for (let i = 0; i < remaining.length; i++) {
          if (!remaining[i].isFormerChampion) { bestIdx = i; break; }
        }
      }
      // Last resort: any opponent
      if (bestIdx === -1) bestIdx = 0;
      const b = remaining.splice(bestIdx, 1)[0];
      matches.push({ red: a.id, blue: b.id });
    }

    // If odd number and there's a leftover athlete, they get a bye
    if (hasBye && remaining.length === 1) {
      const byeAthlete = remaining[0];
      // Bye athletes get a match solo (they advance automatically)
      matches.push({ red: byeAthlete.id, blue: null });
    }

    return matches;
  }

  async generateMatches(competitionId: string, athleteIds: string[], matId?: string) {
    if (athleteIds.length < 2) {
      throw new BadRequestException('Au moins 2 athlètes requis');
    }

    // Skip athletes already in matches
    const existingMatches = await this.prisma.match.findMany({
      where: {
        competitionId,
        OR: [{ redCornerId: { in: athleteIds } }, { blueCornerId: { in: athleteIds } }],
      },
      select: { redCornerId: true, blueCornerId: true },
    });
    const alreadyPaired = new Set<string>();
    for (const m of existingMatches) { alreadyPaired.add(m.redCornerId!); alreadyPaired.add(m.blueCornerId!); }
    const available = athleteIds.filter(id => !alreadyPaired.has(id));
    if (available.length < 2) throw new BadRequestException('Tous les athlètes déjà appariés');

    // Fetch signup data with weight, champion status, and club for seeding
    const signups = await this.prisma.competitionSignup.findMany({
      where: { competitionId, personId: { in: available }, status: 'APPROVED' as any },
      include: { person: { select: { id: true, clubId: true } } },
    });

    const teams = await this.prisma.team.findMany({
      where: { competitionId },
      include: { members: { select: { personId: true } } },
    });

    const athletes = available.map(id => {
      const signup = signups.find(s => s.personId === id);
      const personTeamIds = teams
        .filter(t => t.members.some(m => m.personId === id))
        .map(t => t.id);
      return {
        id,
        weight: signup?.weight ?? 0,
        isFormerChampion: signup?.isFormerChampion ?? false,
        clubId: signup?.person?.clubId ?? undefined,
        teamIds: personTeamIds,
      };
    });

    // Compute bracket size early so we can scope empty-placeholder deletion
    // to only the rounds this bracket will recreate (rounds 2+).
    let bracketSize = 1;
    if (athletes.length > 3) {
      while (bracketSize < athletes.length) bracketSize *= 2;
    }
    const maxRound = athletes.length <= 3 ? 1 : Math.ceil(Math.log2(bracketSize)) || 1;

    // Delete existing matches for these athletes to allow regeneration.
    // Only delete empty placeholders in rounds that this bracket will recreate
    // (round 2+), to avoid destroying other categories' bracket structures.
    await this.prisma.match.deleteMany({
      where: {
        competitionId,
        OR: [
          { redCornerId: { in: available } },
          { blueCornerId: { in: available } },
          { redCornerId: null, blueCornerId: null, round: { gte: 2, lte: maxRound } },
        ],
      },
    });

    // Handle 3 athletes: round-robin
    if (athletes.length === 3) {
      const mats = await this.prisma.mat.findMany({ where: { competitionId }, orderBy: { number: 'asc' } });
      if (mats.length === 0) throw new BadRequestException('Aucun tapis disponible');
      const [a, b, c] = athletes;
      const allMatches: any[] = [];
      const pairs = [[a, b], [b, c], [a, c]];
      for (let i = 0; i < pairs.length; i++) {
        const assignedMatId = matId || mats[i % mats.length].id;
        const match = await this.prisma.match.create({
          data: {
            competitionId,
            redCornerId: pairs[i][0].id,
            blueCornerId: pairs[i][1].id,
            matId: assignedMatId,
            round: 1,
            bracketPosition: i + 1,
            status: 'UPCOMING',
          },
          include: {
            mat: { select: { id: true, name: true, number: true } },
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        allMatches.push(match);
      }
      return { data: { matches: allMatches, total: allMatches.length, rounds: 1, type: 'round-robin' } };
    }

    // bracketSize and maxRound are already computed above

    const firstRoundMatches = this.seedFirstRound(athletes);

    const mats = await this.prisma.mat.findMany({ where: { competitionId }, orderBy: { number: 'asc' } });
    if (mats.length === 0) throw new BadRequestException('Aucun tapis disponible');

    const allMatches: any[] = [];
    const round1Winners: string[] = [];

    // Create round 1 matches from seeded pairs
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const pair = firstRoundMatches[i];
      const assignedMatId = matId || mats[i % mats.length].id;

      if (pair.blue === null) {
        // BYE: solo athlete advances automatically
        const match = await this.prisma.match.create({
          data: {
            competitionId, redCornerId: pair.red, matId: assignedMatId,
            round: 1, bracketPosition: i + 1,
            status: 'FINISHED', winnerSide: 'red', winMethod: 'BYE',
            redScore: 0, blueScore: 0,
          },
          include: {
            mat: { select: { id: true, name: true, number: true } },
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        allMatches.push(match);
        if (pair.red) round1Winners.push(pair.red);
      } else {
        // Normal match
        const match = await this.prisma.match.create({
          data: {
            competitionId,
            redCornerId: pair.red,
            blueCornerId: pair.blue,
            matId: assignedMatId,
            round: 1,
            bracketPosition: i + 1,
            status: 'UPCOMING',
          },
          include: {
            mat: { select: { id: true, name: true, number: true } },
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        allMatches.push(match);
      }
    }

    // Generate subsequent rounds from round1Winners + round 1 match winners
    let currentRoundWinners = round1Winners;
    let currentRound = 2;
    const totalRealMatches = firstRoundMatches.filter(m => m.blue !== null).length;

    // If only 2 athletes (1 match) that's the final — no placeholder rounds needed
    if (totalRealMatches > 1 || round1Winners.length > 0) {
    let remainingSlots = totalRealMatches;
    while (remainingSlots > 1) {
      remainingSlots = Math.ceil(remainingSlots / 2);
      for (let i = 0; i < remainingSlots; i++) {
        const assignedMatId = mats[i % mats.length].id;
        // Check if a match already exists at this position (from bye pre-seeding)
        const existing = await this.prisma.match.findFirst({
          where: { competitionId, round: currentRound, bracketPosition: i + 1 },
        });
        if (!existing) {
          const match = await this.prisma.match.create({
            data: {
              competitionId,
              matId: assignedMatId,
              round: currentRound,
              bracketPosition: i + 1,
              status: 'UPCOMING',
            },
            include: {
              mat: { select: { id: true, name: true, number: true } },
              redCorner: { select: { id: true, firstName: true, lastName: true } },
              blueCorner: { select: { id: true, firstName: true, lastName: true } },
            },
          });
          allMatches.push(match);
        }
      }
      currentRound++;
    }

    // Pre-seed bye athletes into round 2
    for (let i = 0; i < round1Winners.length; i++) {
      const nextPos = Math.floor(i / 2) + 1;
      const isRed = i % 2 === 0;
      const round2Match = await this.prisma.match.findFirst({
        where: { competitionId, round: 2, bracketPosition: nextPos },
      });
      if (round2Match) {
        await this.prisma.match.update({
          where: { id: round2Match.id },
          data: isRed
            ? { redCornerId: round1Winners[i] }
            : { blueCornerId: round1Winners[i] },
        });
      }
    }
    } // end if (needs more rounds)

    return { data: { matches: allMatches, total: allMatches.length, rounds: currentRound - 1 } };
  }

  async getWeightCategoriesFor(ageDivision: AgeDivision, gender: string) {
    return { data: getWeightCategories(ageDivision, gender) };
  }

  // ── Mats ──
  async getMats(competitionId: string) {
    const mats = await this.prisma.mat.findMany({
      where: { competitionId },
      include: { _count: { select: { matches: true } } },
      orderBy: { number: 'asc' },
    });
    return { data: mats };
  }

  async createMat(competitionId: string, name: string, number: number) {
    const mat = await this.prisma.mat.create({
      data: { competitionId, name, number },
    });
    return { message: 'Tapis créé', data: mat };
  }

  async updateMat(matId: string, data: { name?: string; number?: number }) {
    const mat = await this.prisma.mat.findUnique({ where: { id: matId } });
    if (!mat) throw new NotFoundException('Tapis non trouvé');
    const updated = await this.prisma.mat.update({ where: { id: matId }, data });
    return { message: 'Tapis mis à jour', data: updated };
  }

  async deleteMat(matId: string) {
    const mat = await this.prisma.mat.findUnique({ where: { id: matId } });
    if (!mat) throw new NotFoundException('Tapis non trouvé');
    await this.prisma.mat.delete({ where: { id: matId } });
    return { message: 'Tapis supprimé' };
  }

  async generateModerationToken(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) throw new NotFoundException("Compétition non trouvée");
    const token = crypto.randomUUID();
    await this.prisma.competition.update({ where: { id: competitionId }, data: { moderationToken: token } });
    return { data: { token } };
  }

  async getModerationView(competitionId: string, token: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        mats: { orderBy: { number: 'asc' } },
        signups: {
          include: {
            person: {
              select: { id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true, club: { select: { id: true, name: true } }, athleteDetails: { select: { grade: true, weight: true } } },
            },
          },
        },
        matches: {
          include: {
            mat: { select: { id: true, name: true, number: true } },
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
        },
        teams: { include: { members: { include: { person: { select: { id: true, firstName: true, lastName: true } } } } } },
      },
    });
    if (!competition) throw new NotFoundException("Compétition non trouvée");
    if (!competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }

    // Compute bracket categories from signups (same logic as generateBrackets but read-only)
    const approvedSignups = competition.signups.filter((s: any) => s.status === 'APPROVED' && s.type === 'ATHLETE');
    const isIBJJF = competition.splitByBelt === true;
    const seasonYear = competition.seasonYear || 2026;
    const bracketResult = this.buildCategories(approvedSignups, competition.ageDivisions, isIBJJF, seasonYear, competition.date);
    const categories = bracketResult.categories;

    // Group real matches by category (only matches that have at least one athlete from the category)
    const categoryMatches: Record<string, any[]> = {};
    for (const cat of categories) {
      const athleteIdSet = new Set(cat.athletes);
      const realMatches = competition.matches.filter((m: any) => {
        if (!m.redCornerId && !m.blueCornerId) return false;
        return athleteIdSet.has(m.redCornerId) || athleteIdSet.has(m.blueCornerId);
      });
      if (realMatches.length > 0) {
        categoryMatches[cat.name] = realMatches;
      }
    }

    // Assign empty placeholder matches to the correct category.
    // Each empty match at round R, bracketPosition P is logically fed by the two matches
    // at round R-1 with bracketPositions (P-1)*2+1 and (P-1)*2+2.
    // The category with the MOST feeder matches in the previous round gets the empty match.
    // Empty matches are processed in round order so earlier rounds are assigned first,
    // ensuring that when we reach round R, round R-1 empty matches are already assigned.
    const emptyMatches = competition.matches
      .filter((m: any) => !m.redCornerId && !m.blueCornerId)
      .sort((a: any, b: any) => (a.round || 1) - (b.round || 1));

    for (const emptyMatch of emptyMatches) {
      const round = emptyMatch.round || 1;
      const bracketPos = emptyMatch.bracketPosition || 1;
      // Feeder bracket positions in the previous round
      const feederPos1 = (bracketPos - 1) * 2 + 1;
      const feederPos2 = feederPos1 + 1;

      // Score each category by how many feeder matches it has at the feeder positions
      let bestCategory: string | null = null;
      let bestScore = 0;
      for (const cat of categories) {
        const catMatches = categoryMatches[cat.name] || [];
        let score = 0;
        for (const m of catMatches) {
          if (m.round === round - 1 && m.bracketPosition === feederPos1) score++;
          if (m.round === round - 1 && m.bracketPosition === feederPos2) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestCategory = cat.name;
        }
      }

      if (bestCategory) {
        if (!categoryMatches[bestCategory]) categoryMatches[bestCategory] = [];
        categoryMatches[bestCategory].push(emptyMatch);
      }
    }

    // Sort matches within each category by round then bracket position
    for (const catName of Object.keys(categoryMatches)) {
      categoryMatches[catName].sort((a: any, b: any) => {
        if (a.round !== b.round) return a.round - b.round;
        return (a.bracketPosition || 1) - (b.bracketPosition || 1);
      });
    }

    return {
      data: {
        ...competition,
        brackets: { categories, totalAthletes: approvedSignups.length, splitByBelt: isIBJJF },
        categoryMatches,
      },
    };
  }

  async moderateUpdateWeight(competitionId: string, token: string, signupId: string, weight: number) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    const signup = await this.prisma.competitionSignup.findUnique({ where: { id: signupId } });
    if (!signup || signup.competitionId !== competitionId) {
      throw new NotFoundException("Inscription non trouvée");
    }
    const updated = await this.prisma.competitionSignup.update({
      where: { id: signupId },
      data: { weight },
    });
    return { message: "Poids mis à jour", data: updated };
  }

  async moderateToggleChampion(competitionId: string, token: string, signupId: string, isFormerChampion: boolean) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    const signup = await this.prisma.competitionSignup.findUnique({ where: { id: signupId } });
    if (!signup || signup.competitionId !== competitionId) {
      throw new NotFoundException("Inscription non trouvée");
    }
    await this.prisma.competitionSignup.update({
      where: { id: signupId },
      data: { isFormerChampion },
    });
    return { message: 'Statut champion mis à jour' };
  }

  async moderateUpdateMatchScore(
    competitionId: string,
    token: string,
    matchId: string,
    data: { redScore?: number; blueScore?: number; warningsRed?: number; penaltiesRed?: number; warningsBlue?: number; penaltiesBlue?: number; status?: string; winMethod?: string; winnerSide?: string },
  ) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.competitionId !== competitionId) {
      throw new NotFoundException("Match non trouvé");
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        ...(data.redScore !== undefined && { redScore: data.redScore }),
        ...(data.blueScore !== undefined && { blueScore: data.blueScore }),
        ...(data.warningsRed !== undefined && { warningsRed: data.warningsRed }),
        ...(data.penaltiesRed !== undefined && { penaltiesRed: data.penaltiesRed }),
        ...(data.warningsBlue !== undefined && { warningsBlue: data.warningsBlue }),
        ...(data.penaltiesBlue !== undefined && { penaltiesBlue: data.penaltiesBlue }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.winMethod !== undefined && { winMethod: data.winMethod }),
        ...(data.winnerSide !== undefined && { winnerSide: data.winnerSide }),
      },
      include: {
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (data.status === 'FINISHED') {
      await this.advanceWinner(matchId);
    }
    return { message: "Score mis à jour", data: updated };
  }

  private async advanceWinner(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { redCornerId: true, blueCornerId: true, winnerSide: true, round: true, bracketPosition: true, competitionId: true },
    });
    if (!match || !match.winnerSide) return;

    const winnerId = match.winnerSide === 'red' ? match.redCornerId : match.blueCornerId;
    if (!winnerId) return;

    // Find the next round match at the corresponding bracket position
    const nextPos = Math.ceil((match.bracketPosition || 1) / 2);
    const nextMatch = await this.prisma.match.findFirst({
      where: {
        competitionId: match.competitionId,
        round: match.round + 1,
        bracketPosition: nextPos,
      },
    });

    if (!nextMatch) return;

    // Determine if winner goes to red or blue corner (odd position = red, even = blue)
    const isRed = (match.bracketPosition || 1) % 2 === 1;
    await this.prisma.match.update({
      where: { id: nextMatch.id },
      data: isRed ? { redCornerId: winnerId } : { blueCornerId: winnerId },
    });
  }

  async moderateGenerateBrackets(competitionId: string, token: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.generateBrackets(competitionId);
  }

  async moderateGenerateMatches(competitionId: string, token: string, athleteIds: string[], matId?: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.generateMatches(competitionId, athleteIds, matId);
  }

  async moderateCreateMat(competitionId: string, token: string, name: string, number: number) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.createMat(competitionId, name, number);
  }

  async moderateDeleteMat(competitionId: string, token: string, matId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.deleteMat(matId);
  }

  async moderateResetMatches(competitionId: string, token: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    const deleted = await this.prisma.match.deleteMany({ where: { competitionId } });
    return { message: `${deleted.count} match(s) supprimé(s)`, data: { deleted: deleted.count } };
  }

  async generateNextRound(competitionId: string, categoryName: string, currentRound: number) {
    // Get all matches for this competition
    const allMatches = await this.prisma.match.findMany({
      where: { competitionId },
      include: {
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Get winners from the current round (matches with status FINISHED and current round)
    const roundMatches = allMatches.filter(m => m.round === currentRound && m.status === 'FINISHED');

    if (roundMatches.length < 1) {
      throw new BadRequestException(`Aucun match terminé au round ${currentRound}`);
    }

    // Collect winners
    const winners: string[] = [];
    for (const m of roundMatches) {
      if (m.winnerSide === 'red' && m.redCornerId) winners.push(m.redCornerId);
      else if (m.winnerSide === 'blue' && m.blueCornerId) winners.push(m.blueCornerId);
      // If draw or no winner, skip (or could handle differently)
    }

    if (winners.length < 2) {
      throw new BadRequestException(`Pas assez de gagnants (${winners.length}) pour générer le round ${currentRound + 1}`);
    }

    // Shuffle and pair winners
    const shuffled = [...winners].sort(() => Math.random() - 0.5);
    const nextRound = currentRound + 1;
    const mats = await this.prisma.mat.findMany({ where: { competitionId }, orderBy: { number: 'asc' } });
    if (mats.length === 0) throw new BadRequestException('Aucun tapis disponible');

    const newMatches: any[] = [];
    let matchCount = 0;
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const matId = mats[matchCount % mats.length].id;
        const match = await this.prisma.match.create({
          data: {
            competitionId,
            redCornerId: shuffled[i],
            blueCornerId: shuffled[i + 1],
            matId,
            round: nextRound,
            status: 'UPCOMING',
          },
          include: {
            mat: { select: { id: true, name: true, number: true } },
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        newMatches.push(match);
        matchCount++;
      }
    }

    return {
      data: {
        matches: newMatches,
        total: newMatches.length,
        round: nextRound,
        byes: winners.length - newMatches.length * 2,
        winners,
      },
    };
  }

  async moderateGenerateNextRound(competitionId: string, token: string, categoryName: string, currentRound: number) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.generateNextRound(competitionId, categoryName, currentRound);
  }

  async toggleCloseCompetition(competitionId: string) {
    const comp = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!comp) throw new NotFoundException("Compétition non trouvée");
    const updated = await this.prisma.competition.update({
      where: { id: competitionId },
      data: { isClosed: !comp.isClosed },
    });
    return { message: updated.isClosed ? "Compétition clôturée" : "Compétition rouverte", data: updated };
  }

  async moderateToggleClose(competitionId: string, token: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.toggleCloseCompetition(competitionId);
  }

  async replaceMatchAthlete(matchId: string, side: 'red' | 'blue', newPersonId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException("Match non trouvé");
    const person = await this.prisma.person.findUnique({ where: { id: newPersonId } });
    if (!person) throw new NotFoundException("Athlète non trouvé");

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: side === 'red' ? { redCornerId: newPersonId } : { blueCornerId: newPersonId },
      include: {
        mat: { select: { id: true, name: true, number: true } },
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return { message: "Athlète remplacé", data: updated };
  }

  async moderateReplaceAthlete(competitionId: string, token: string, matchId: string, side: 'red' | 'blue', newPersonId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.replaceMatchAthlete(matchId, side, newPersonId);
  }

  async moderateGetTeams(competitionId: string, token: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.prisma.team.findMany({
      where: { competitionId },
      include: { members: { include: { person: { select: { id: true, firstName: true, lastName: true, club: { select: { id: true, name: true } } } } } } },
    });
  }

  async moderateCreateTeam(competitionId: string, token: string, name: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.prisma.team.create({ data: { competitionId, name }, include: { members: true } });
  }

  async moderateAddTeamMember(competitionId: string, token: string, teamId: string, personId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    return this.prisma.teamMember.create({ data: { teamId, personId }, include: { person: { select: { id: true, firstName: true, lastName: true } } } });
  }

  async moderateRemoveTeamMember(competitionId: string, token: string, teamId: string, personId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    await this.prisma.teamMember.deleteMany({ where: { teamId, personId } });
    return { message: 'Membre retiré' };
  }

  async moderateDeleteTeam(competitionId: string, token: string, teamId: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition || !competition.moderationToken || competition.moderationToken !== token) {
      throw new ForbiddenException("Token de modération invalide");
    }
    await this.prisma.team.delete({ where: { id: teamId } });
    return { message: 'Équipe supprimée' };
  }

  private computeIsRegistrationOpen(competitionDate: Date): boolean {
    const now = new Date();
    const cutoff = new Date(competitionDate);
    cutoff.setDate(cutoff.getDate() - 2);
    cutoff.setHours(0, 0, 0, 0);
    return now < cutoff;
  }
}
