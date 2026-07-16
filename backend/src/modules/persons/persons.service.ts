import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreatePersonDto,
  UpdatePersonDto,
  BatchCreatePersonDto,
} from "./persons.dto";
import { PersonType, Role } from "@prisma/client";
import { getAgeDivision, getWeightCategory, getCurrentSeasonYear } from "../../common/utils/age-division";

@Injectable()
export class PersonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    filters: { type?: PersonType; clubId?: string; search?: string },
    user?: { id: string; role: Role },
  ) {
    const where: any = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.clubId) {
      where.clubId = filters.clubId;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Club owners only see persons in their club
    if (user && user.role === Role.CLUB_OWNER) {
      const club = await this.prisma.club.findUnique({
        where: { ownerId: user.id },
      });
      if (club) {
        where.clubId = club.id;
      } else {
        return { data: [] };
      }
    }

    const persons = await this.prisma.person.findMany({
      where,
      include: {
        club: { select: { id: true, name: true } },
        athleteDetails: true,
        coachDetails: true,
        refereeDetails: true,
        technicianDetails: true,
        licenses: {
          where: { isActive: true },
          include: { pricing: true },
          take: 1,
        },
      },
      orderBy: { lastName: "asc" },
    });

    return {
      data: persons.map((p) => ({
        ...p,
        isMinor: this.isMinor(p.dateOfBirth),
      })),
    };
  }

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        athleteDetails: true,
        coachDetails: true,
        refereeDetails: true,
        technicianDetails: true,
        licenses: {
          include: { pricing: true },
          orderBy: { issuedAt: "desc" },
        },
      },
    });

    if (!person) {
      throw new NotFoundException("Personne non trouvée");
    }

    return {
      data: {
        ...person,
        isMinor: this.isMinor(person.dateOfBirth),
      },
    };
  }

  async create(dto: CreatePersonDto, user?: { id: string; role: Role }) {
    // Validate age constraints
    this.validateAgeConstraints(dto.dateOfBirth, dto.type);

    // Validate at least one identity document is provided
    if (!dto.identityDocumentUrl && !dto.birthCertificateUrl) {
      throw new BadRequestException(
        "Vous devez fournir au moins un document d'identité (CIN ou Acte de naissance)",
      );
    }

    // Resolve clubId
    let clubId = dto.clubId;

    if (user && user.role === Role.CLUB_OWNER) {
      const club = await this.prisma.club.findUnique({
        where: { ownerId: user.id },
      });
      if (!club) {
        throw new ForbiddenException("Aucun club associé à votre compte");
      }
      // Auto-assign club owner's club, ignore any passed clubId
      clubId = club.id;
    }

    if (!clubId) {
      throw new BadRequestException("L'ID du club est obligatoire");
    }

    // Generate athlete code (ATHTJJF prefix + auto-increment)
    const code = await this.generatePersonCode();

    const {
      grade,
      weight,
      blackBeltAttestationUrl,
      coachingAttestationUrl,
      contractUrl,
      refereeDegreeAttestationUrl,
      specialization,
      ...personData
    } = dto;

    const person = await this.prisma.person.create({
      data: {
        ...personData,
        code,
        clubId,
        dateOfBirth: new Date(personData.dateOfBirth),
        // Create type-specific details
        ...(dto.type === PersonType.ATHLETE && {
          athleteDetails: {
            create: { grade: grade || null, weight: weight || null },
          },
        }),
        ...(dto.type === PersonType.COACH && {
          coachDetails: {
            create: {
              blackBeltAttestationUrl: blackBeltAttestationUrl || null,
              coachingAttestationUrl: coachingAttestationUrl || null,
              contractUrl: contractUrl || null,
            },
          },
        }),
        ...(dto.type === PersonType.REFEREE && {
          refereeDetails: {
            create: {
              refereeDegreeAttestationUrl: refereeDegreeAttestationUrl || null,
            },
          },
        }),
        ...(dto.type === PersonType.TECHNICIAN && {
          technicianDetails: {
            create: {
              specialization: specialization || null,
            },
          },
        }),
      },
      include: {
        athleteDetails: true,
        coachDetails: true,
        refereeDetails: true,
        technicianDetails: true,
      },
    });

    return { message: "Personne créée avec succès", data: person };
  }

  async update(
    id: string,
    dto: UpdatePersonDto,
    user?: { id: string; role: Role },
  ) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: { club: true },
    });

    if (!person) {
      throw new NotFoundException("Personne non trouvée");
    }

    if (user && user.role === Role.CLUB_OWNER) {
      const club = await this.prisma.club.findUnique({
        where: { ownerId: user.id },
      });
      if (!club || club.id !== person.clubId) {
        throw new ForbiddenException(
          "Vous ne pouvez modifier que les personnes de votre club",
        );
      }
    }

    const {
      grade,
      weight,
      blackBeltAttestationUrl,
      coachingAttestationUrl,
      contractUrl,
      refereeDegreeAttestationUrl,
      specialization,
      ...personData
    } = dto;

    const updated = await this.prisma.person.update({
      where: { id },
      data: {
        ...personData,
        // Update type-specific details
        ...(person.type === PersonType.ATHLETE &&
          (grade !== undefined || weight !== undefined) && {
            athleteDetails: {
              upsert: {
                create: { grade: grade || null, weight: weight || null },
                update: {
                  ...(grade !== undefined && { grade }),
                  ...(weight !== undefined && { weight }),
                },
              },
            },
          }),
        ...(person.type === PersonType.COACH && {
          coachDetails: {
            upsert: {
              create: {
                blackBeltAttestationUrl: blackBeltAttestationUrl || null,
                coachingAttestationUrl: coachingAttestationUrl || null,
                contractUrl: contractUrl || null,
              },
              update: {
                ...(blackBeltAttestationUrl !== undefined && {
                  blackBeltAttestationUrl,
                }),
                ...(coachingAttestationUrl !== undefined && {
                  coachingAttestationUrl,
                }),
                ...(contractUrl !== undefined && { contractUrl }),
              },
            },
          },
        }),
        ...(person.type === PersonType.REFEREE &&
          refereeDegreeAttestationUrl !== undefined && {
            refereeDetails: {
              upsert: {
                create: { refereeDegreeAttestationUrl },
                update: { refereeDegreeAttestationUrl },
              },
            },
          }),
        ...(person.type === PersonType.TECHNICIAN &&
          specialization !== undefined && {
            technicianDetails: {
              upsert: {
                create: { specialization },
                update: { specialization },
              },
            },
          }),
      },
      include: {
        athleteDetails: true,
        coachDetails: true,
        refereeDetails: true,
        technicianDetails: true,
      },
    });

    return { message: "Personne mise à jour avec succès", data: updated };
  }

  async delete(id: string) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) {
      throw new NotFoundException("Personne non trouvée");
    }

    await this.prisma.person.delete({ where: { id } });
    return { message: "Personne supprimée avec succès" };
  }

  async batchCreate(
    dto: BatchCreatePersonDto,
    user?: { id: string; role: Role },
  ) {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < dto.persons.length; i++) {
      try {
        const personDto = dto.persons[i];
        if (user && user.role === Role.CLUB_OWNER) {
          const club = await this.prisma.club.findUnique({
            where: { ownerId: user.id },
          });
          if (!club) {
            errors.push({ index: i, message: "Club non trouvé" });
            continue;
          }
          personDto.clubId = club.id;
        }
        const result = await this.create(personDto, user);
        results.push(result.data);
      } catch (error) {
        errors.push({
          index: i,
          message: error.message || "Erreur de création",
          person: dto.persons[i],
        });
      }
    }

    return {
      message: `${results.length} personne(s) créée(s), ${errors.length} erreur(s)`,
      data: { created: results, errors },
    };
  }

  async importCsv(rows: any[], user?: { id: string; role: Role }) {
    const results: any[] = [];
    const errors: any[] = [];

    // Pre-cache club name to id mapping for admin imports
    const clubs = await this.prisma.club.findMany({ select: { id: true, name: true } });
    const clubByName: Record<string, string> = {};
    for (const c of clubs) {
      clubByName[c.name.toLowerCase().trim()] = c.id;
    }

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        const firstName = row.firstName || row.first_name || row.prenom || "";
        const lastName = row.lastName || row.last_name || row.nom || "";

        // Parse date: handle DD/MM/YYYY and YYYY-MM-DD
        let dateStr = row.dateOfBirth || row.date_of_birth || row.date_naissance || row["date de naissance"] || "";
        if (dateStr && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
          const parts = dateStr.split("/");
          dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }

        // Gender: map G/HOMME to MALE, F/FEMME to FEMALE
        const genderRaw = (row.gender || row.genre || row.sexe || "MALE").toString().toUpperCase().trim();
        let gender: string;
        if (genderRaw === "G" || genderRaw === "GARCON" || genderRaw === "HOMME") gender = "MALE";
        else if (genderRaw === "F" || genderRaw === "FILLE" || genderRaw === "FEMME") gender = "FEMALE";
        else if (genderRaw === "MALE" || genderRaw === "FEMALE") gender = genderRaw;
        else gender = "MALE";

        // Club: resolve by name or direct UUID
        let clubId = row.clubId || row.club_id || "";
        if (!clubId) {
          const clubName = (row.club || row.club_name || row.club_nom || "").trim();
          if (clubName) {
            clubId = clubByName[clubName.toLowerCase()] || "";
            if (!clubId) {
              throw new Error(`Club "${clubName}" introuvable. Veuillez le creer d'abord.`);
            }
          }
        }

        // Map CSV columns to DTO
        const dto: CreatePersonDto = {
          firstName,
          lastName,
          dateOfBirth: dateStr,
          nationality: row.nationality || row.nationalite || "Tunisienne",
          gender: gender as any,
          type: (
            row.type ||
            row.type_personne ||
            "ATHLETE"
          ).toUpperCase() as any,
          identityDocumentType: (
            row.identityDocumentType ||
            row.type_document ||
            "CIN"
          ).toUpperCase() as any,
          identityDocumentUrl:
            row.identityDocumentUrl || row.url_document || "",
          photoUrl: row.photoUrl || row.url_photo || null,
          grade: row.grade || row.ceinture || null,
          clubId,
        };

        if (user && user.role === Role.CLUB_OWNER) {
          const club = await this.prisma.club.findUnique({
            where: { ownerId: user.id },
          });
          if (club) dto.clubId = club.id;
        }

        const result = await this.create(dto, user);
        results.push(result.data);
      } catch (error) {
        errors.push({ row: i + 1, message: error.message });
      }
    }

    return {
      message: `${results.length} personne(s) importée(s), ${errors.length} erreur(s)`,
      data: { created: results, errors },
    };
  }

  private async generatePersonCode(): Promise<string> {
    const PREFIX = "ATHTJJF";
    // Find the highest existing code number
    const lastPerson = await this.prisma.person.findFirst({
      where: { code: { startsWith: PREFIX } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    let nextNum = 3094; // start from 3094 if no codes exist
    if (lastPerson?.code) {
      const numPart = lastPerson.code.slice(PREFIX.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
    return `${PREFIX}${nextNum}`;
  }

  private isMinor(dateOfBirth: Date): boolean {
    const now = new Date();
    const age = now.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = now.getMonth() - dateOfBirth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())
    ) {
      return age - 1 < 18;
    }
    return age < 18;
  }

  private validateAgeConstraints(dateOfBirthStr: string, type: PersonType) {
    const dob = new Date(dateOfBirthStr);
    const isMinor = this.isMinor(dob);

    if (type !== PersonType.ATHLETE && isMinor) {
      throw new BadRequestException(
        "Seuls les athlètes peuvent être mineurs. Les coachs, arbitres et techniciens doivent avoir au moins 18 ans.",
      );
    }
  }

  async exportCsv(
    filters: { clubId: string; type: PersonType },
    user: { id: string; role: Role },
  ): Promise<string> {
    const data = await this.findAll(
      { clubId: filters.clubId || undefined, type: filters.type || undefined },
      user,
    );
    const persons = data.data || [];

    const seasonYear = getCurrentSeasonYear();

    const headers = [
      "code",
      "firstName",
      "lastName",
      "dateOfBirth",
      "ageDivision",
      "weightCategory",
      "nationality",
      "gender",
      "identityDocumentType",
      "identityDocumentUrl",
      "birthCertificateUrl",
      "photoUrl",
      "type",
      "grade",
      "clubId",
    ];

    const rows = persons.map((p: any) => {
      // Compute age division from date of birth
      let ageDivision = "";
      let weightCategory = "";
      if (p.dateOfBirth) {
        const birthYear = new Date(p.dateOfBirth).getFullYear();
        ageDivision = getAgeDivision(birthYear, seasonYear);
        const weight = p.athleteDetails?.weight;
        if (weight != null) {
          weightCategory = getWeightCategory(weight, p.gender || "MALE", ageDivision);
        }
      }

      return headers
        .map((h) => {
          if (h === "ageDivision") return ageDivision;
          if (h === "weightCategory") return weightCategory;
          if (h === "grade") return p.athleteDetails?.grade || "";
          const val = p[h];
          if (val instanceof Date) return val.toISOString().slice(0, 10);
          return val != null ? String(val).replace(/,/g, ";") : "";
        })
        .join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }
}
