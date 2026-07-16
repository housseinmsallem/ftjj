import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RegistrationStatus, PersonType, AgeDivision } from "@prisma/client";
import {
  getWeightCategory,
  getWeightCategories,
  getBeltGroup,
  validateAgeDivision,
  getCurrentSeasonYear,
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
    return { data: competitions };
  }

  async findOne(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        documents: true,
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
          orderBy: { matNumber: "asc" },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException("Compétition non trouvée");
    }

    return { data: competition };
  }

  async create(data: {
    name: string;
    date: string;
    location?: string;
    description?: string;
    type?: string;
    splitByBelt?: boolean;
    ageDivision?: AgeDivision;
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
        ageDivision: data.ageDivision || AgeDivision.ADULTS,
        seasonYear: data.seasonYear || getCurrentSeasonYear(),
        posterUrl: data.posterUrl || null,
      },
    });

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
      ageDivision?: AgeDivision;
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
        ...(data.ageDivision !== undefined && {
          ageDivision: data.ageDivision,
        }),
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
    paymentReceiptUrl?: string;
  }) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: data.competitionId },
    });
    if (!competition) {
      throw new NotFoundException("Compétition non trouvée");
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
      const validation = validateAgeDivision(
        birthYear,
        competition.ageDivision,
        competition.seasonYear,
        competition.date,
      );
      if (!validation.valid) {
        throw new BadRequestException(validation.message!);
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

  async generateBrackets(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });
    if (!competition) throw new NotFoundException("Compétition non trouvée");

    const signups = (await this.prisma.competitionSignup.findMany({
      where: { competitionId, status: "APPROVED" as any, type: "ATHLETE" },
      include: { person: { include: { athleteDetails: true } } },
    })) as any[];

    if (signups.length === 0) {
      throw new BadRequestException(
        "Aucun athlète confirmé trouvé pour générer les brackets",
      );
    }

    const isIBJJF = competition.splitByBelt === true;
    const ageDiv = competition.ageDivision;
    const categories: { name: string; athletes: string[] }[] = [];

    const byGender: Record<string, typeof signups> = {};
    for (const s of signups) {
      const g = s.person.gender || "MALE";
      if (!byGender[g]) byGender[g] = [];
      byGender[g].push(s);
    }

    for (const [gender, athletes] of Object.entries(byGender)) {
      const byWeight: Record<string, typeof signups> = {};
      for (const a of athletes) {
        const w = a.person.athleteDetails?.weight;
        const wc = getWeightCategory(w, gender, ageDiv);
        if (!byWeight[wc]) byWeight[wc] = [];
        byWeight[wc].push(a);
      }

      for (const [wc, wAthletes] of Object.entries(byWeight)) {
        if (isIBJJF) {
          const byBelt: Record<string, typeof signups> = {};
          for (const a of wAthletes) {
            const grade = a.person.athleteDetails?.grade || "WHITE";
            const belt = getBeltGroup(grade);
            if (!byBelt[belt]) byBelt[belt] = [];
            byBelt[belt].push(a);
          }
          for (const [belt, bAthletes] of Object.entries(byBelt)) {
            if (bAthletes.length >= 2) {
              categories.push({
                name: `${gender === "MALE" ? "Hommes" : "Femmes"} ${wc} - ${belt}`,
                athletes: bAthletes.map((a: any) => a.personId),
              });
            }
          }
        } else {
          if (wAthletes.length >= 2) {
            categories.push({
              name: `${gender === "MALE" ? "Hommes" : "Femmes"} ${wc}`,
              athletes: wAthletes.map((a: any) => a.personId),
            });
          }
        }
      }
    }

    return {
      data: {
        competitionId,
        splitByBelt: competition.splitByBelt,
        ageDivision: competition.ageDivision,
        categories,
        totalAthletes: signups.length,
      },
    };
  }

  async generateMatches(competitionId: string, athleteIds: string[], matStart: number = 1) {
    if (athleteIds.length < 2) {
      throw new BadRequestException('Au moins 2 athlètes requis pour générer des matchs');
    }

    const shuffled = [...athleteIds].sort(() => Math.random() - 0.5);
    const matches: any[] = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const match = await this.prisma.match.create({
          data: {
            competitionId,
            redCornerId: shuffled[i],
            blueCornerId: shuffled[i + 1],
            matNumber: matStart + Math.floor(i / 2),
            status: 'UPCOMING',
          },
          include: {
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        matches.push(match);
      }
    }

    return { data: { matches, total: matches.length } };
  }

  async getWeightCategoriesFor(ageDivision: AgeDivision, gender: string) {
    return { data: getWeightCategories(ageDivision, gender) };
  }
}
