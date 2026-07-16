import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrationStatus } from '@prisma/client';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: RegistrationStatus) {
    const where: any = {};
    if (status) where.status = status;

    const registrations = await this.prisma.registrationRequest.findMany({
      where,
      include: {
        club: { select: { id: true, name: true } },
        person: { select: { id: true, firstName: true, lastName: true, type: true } },
        license: { include: { pricing: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: registrations };
  }

  async findOne(id: string) {
    const reg = await this.prisma.registrationRequest.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        person: { select: { id: true, firstName: true, lastName: true, type: true } },
        license: { include: { pricing: true } },
      },
    });

    if (!reg) {
      throw new NotFoundException('Demande d\'inscription non trouvée');
    }

    return { data: reg };
  }

  async getClubRegistrations(clubId: string) {
    return this.prisma.registrationRequest.findMany({
      where: { clubId },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, type: true } },
        license: { include: { pricing: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
