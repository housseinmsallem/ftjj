import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { club: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: users.map(({ password, ...rest }) => rest),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { club: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const { password, ...rest } = user;
    return { data: rest };
  }

  async updateRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    return { message: 'Rôle mis à jour avec succès' };
  }

  async toggleApproval(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Impossible de désapprouver un administrateur');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isApproved: !user.isApproved },
    });

    return {
      message: updated.isApproved
        ? 'Compte approuvé avec succès'
        : 'Compte désapprouvé',
    };
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Utilisateur supprimé avec succès' };
  }
}
