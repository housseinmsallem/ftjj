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

    // Fetch signup data for club-aware shuffling
    const signupsForShuffle = await this.prisma.competitionSignup.findMany({
      where: { competitionId, personId: { in: available }, status: 'APPROVED' as any },
      include: { person: { select: { id: true, clubId: true } } },
    });
    const athleteClubMap = new Map<string, string | null>(
      signupsForShuffle.map((s: any) => [s.personId, s.person?.clubId || null])
    );
    const shuffledPairs = available.map((id: string) => ({
      personId: id,
      clubId: athleteClubMap.get(id) || null,
    }));
    const shuffled = this.shuffleByClub(shuffledPairs).map((a: any) => a.personId);
    const mats = await this.prisma.mat.findMany({ where: { competitionId }, orderBy: { number: 'asc' } });
    if (mats.length === 0) throw new BadRequestException('Aucun tapis disponible');

    // Calculate bracket size (next power of 2)
    let bracketSize = 1;
    while (bracketSize < available.length) bracketSize *= 2;
    const numFirstRoundMatches = bracketSize / 2;

    // Create ALL bracket matches (including empty placeholders for future rounds)
    const allMatches: any[] = [];

    const byes = bracketSize - available.length;

    // Round 1 matches — handle byes
    let athleteIdx = 0;
    for (let i = 0; i < numFirstRoundMatches; i++) {
      const red = athleteIdx < available.length ? shuffled[athleteIdx++] : null;
      const blue = athleteIdx < available.length ? shuffled[athleteIdx++] : null;
      const assignedMatId = matId || mats[i % mats.length].id;

      if (!red && !blue) {
        // Both slots empty — create placeholder (needed for bracket tree structure)
        const match = await this.prisma.match.create({
          data: { competitionId, matId: assignedMatId, round: 1, bracketPosition: i + 1, status: 'UPCOMING' },
          include: {
            mat: { select: { id: true, name: true, number: true } },
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        allMatches.push(match);
        continue;
      }

      if (red && !blue) {
        // BYE: only one athlete — they advance directly, no opponent
        const match = await this.prisma.match.create({
          data: {
            competitionId, redCornerId: red, matId: assignedMatId,
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
        // Auto-advance the bye athlete to the next round
        const nextPos = Math.ceil((i + 1) / 2);
        const isRed = (i + 1) % 2 === 1;
        // Will be placed in round 2 placeholder below
        continue;
      }

      // Normal match: both athletes present
      const match = await this.prisma.match.create({
        data: {
          competitionId,
          redCornerId: red || undefined,
          blueCornerId: blue || undefined,
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

    // Pre-seed bye athletes into round 2 positions
    // Re-scan round 1 matches for bye winners
    for (const m of allMatches) {
      if (m.round === 1 && m.winMethod === 'BYE' && m.redCornerId) {
        const nextPos = Math.ceil((m.bracketPosition || 1) / 2);
        const isRed = (m.bracketPosition || 1) % 2 === 1;
        // Find or create the round 2 match at this position
        let round2Match = await this.prisma.match.findFirst({
          where: { competitionId, round: 2, bracketPosition: nextPos },
        });
        if (round2Match) {
          await this.prisma.match.update({
            where: { id: round2Match.id },
            data: isRed ? { redCornerId: m.redCornerId } : { blueCornerId: m.redCornerId },
          });
        } else {
          // Create round 2 match with bye athlete pre-seeded
          const assignedMatId = mats[(nextPos - 1) % mats.length].id;
          round2Match = await this.prisma.match.create({
            data: {
              competitionId, matId: assignedMatId, round: 2, bracketPosition: nextPos,
              status: 'UPCOMING',
              ...(isRed ? { redCornerId: m.redCornerId } : { blueCornerId: m.redCornerId }),
            },
            include: {
              mat: { select: { id: true, name: true, number: true } },
              redCorner: { select: { id: true, firstName: true, lastName: true } },
              blueCorner: { select: { id: true, firstName: true, lastName: true } },
            },
          });
          allMatches.push(round2Match);
        }
      }
    }

    // Generate placeholder matches for rounds 2, 3, etc. (skip existing)
    let currentRound = 2;
    let currentBracketSize = numFirstRoundMatches / 2;

    while (currentBracketSize >= 1) {
      for (let i = 0; i < currentBracketSize; i++) {
        // Skip if match already exists (bye pre-seeding)
        const existing = await this.prisma.match.findFirst({
          where: { competitionId, round: currentRound, bracketPosition: i + 1 },
        });
        if (existing) continue;

        const assignedMatId = mats[i % mats.length].id;
        const match = await this.prisma.match.create({
          data: {
            competitionId,
            matId: assignedMatId,
            round: currentRound,
            bracketPosition: (i + 1),
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
      currentRound++;
      currentBracketSize = Math.floor(currentBracketSize / 2);
    }

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

    // Group ALL matches by category (including empty placeholder matches)
    const categoryMatches: Record<string, any[]> = {};
    for (const cat of categories) {
      const athleteIdSet = new Set(cat.athletes);
      // Include matches where at least one athlete is in this category, OR matches that are empty placeholders (no athletes) that belong to this category's bracket
      const catMatches = competition.matches.filter((m: any) => {
        // If match has athletes, check if they're in this category
        if (m.redCornerId || m.blueCornerId) {
          return athleteIdSet.has(m.redCornerId) || athleteIdSet.has(m.blueCornerId);
        }
        // Empty placeholder matches: include them (they'll be displayed as part of the bracket tree)
        return true;
      });

      // Sort by round then bracket position
      catMatches.sort((a: any, b: any) => {
        if (a.round !== b.round) return a.round - b.round;
        return (a.bracketPosition || 1) - (b.bracketPosition || 1);
      });

      if (catMatches.length > 0) {
        categoryMatches[cat.name] = catMatches;
      }
    }

    // Deduplicate empty matches across categories - an empty match should only appear in one category
    const assignedEmptyMatchIds = new Set<string>();
    for (const cat of categories) {
      const filtered = categoryMatches[cat.name]?.filter((m: any) => {
        if (!m.redCornerId && !m.blueCornerId) {
          if (assignedEmptyMatchIds.has(m.id)) return false;
          assignedEmptyMatchIds.add(m.id);
        }
        return true;
      }) || [];
      if (filtered.length > 0) {
        categoryMatches[cat.name] = filtered;
      } else {
        delete categoryMatches[cat.name];
      }
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

  private computeIsRegistrationOpen(competitionDate: Date): boolean {
    const now = new Date();
    const cutoff = new Date(competitionDate);
    cutoff.setDate(cutoff.getDate() - 2);
    cutoff.setHours(0, 0, 0, 0);
    return now < cutoff;
  }
}
