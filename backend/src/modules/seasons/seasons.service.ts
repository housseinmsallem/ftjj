import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.season.findMany({ orderBy: { startsAt: "desc" } });
  }

  async getCurrent() {
    const season = await this.prisma.season.findFirst({ where: { isCurrent: true } });
    return season || null;
  }

  async create(name: string, startsAt: string, endsAt: string, registrationClosesAt?: string) {
    const existing = await this.prisma.season.findUnique({ where: { name } });
    if (existing) throw new BadRequestException("Cette saison existe déjà");
    return this.prisma.season.create({
      data: { name, startsAt: new Date(startsAt), endsAt: new Date(endsAt),
        registrationClosesAt: registrationClosesAt ? new Date(registrationClosesAt) : null },
    });
  }

  async update(id: string, data: { name?: string; startsAt?: string; endsAt?: string; registrationClosesAt?: string | null }) {
    const season = await this.prisma.season.findUnique({ where: { id } });
    if (!season) throw new NotFoundException("Saison non trouvée");
    return this.prisma.season.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startsAt && { startsAt: new Date(data.startsAt) }),
        ...(data.endsAt && { endsAt: new Date(data.endsAt) }),
        ...(data.registrationClosesAt !== undefined && { registrationClosesAt: data.registrationClosesAt ? new Date(data.registrationClosesAt) : null }),
      },
    });
  }

  async activate(id: string) {
    const season = await this.prisma.season.findUnique({ where: { id } });
    if (!season) throw new NotFoundException("Saison non trouvée");
    
    // Deactivate all seasons, then activate this one.
    await this.prisma.season.updateMany({ data: { isCurrent: false } });
    await this.prisma.season.update({ where: { id }, data: { isCurrent: true } });
    
    // Deactivate all licenses — they must be re-registered for the new season
    const deactivated = await this.prisma.license.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    
    return { message: `Saison "${season.name}" activée. ${deactivated.count} licence(s) désactivée(s). Les athlètes doivent se réinscrire pour la nouvelle saison.` };
  }
}
