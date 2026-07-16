import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseCategory } from '@prisma/client';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const pricing = await this.prisma.pricing.findMany({
      orderBy: { category: 'asc' },
    });
    return { data: pricing };
  }

  async findOne(id: string) {
    const pricing = await this.prisma.pricing.findUnique({ where: { id } });
    if (!pricing) {
      throw new NotFoundException('Tarif non trouvé');
    }
    return { data: pricing };
  }

  async findByCategory(category: LicenseCategory) {
    const pricing = await this.prisma.pricing.findMany({
      where: { category },
      orderBy: { amount: 'asc' },
    });
    return { data: pricing };
  }

  async create(data: { name: string; amount: number; category: LicenseCategory }) {
    const pricing = await this.prisma.pricing.create({
      data: {
        name: data.name,
        amount: data.amount,
        category: data.category,
      },
    });

    return { message: 'Tarif créé avec succès', data: pricing };
  }

  async update(id: string, data: { name?: string; amount?: number; category?: LicenseCategory }) {
    const pricing = await this.prisma.pricing.findUnique({ where: { id } });
    if (!pricing) {
      throw new NotFoundException('Tarif non trouvé');
    }

    const updated = await this.prisma.pricing.update({
      where: { id },
      data,
    });

    return { message: 'Tarif mis à jour avec succès', data: updated };
  }

  async delete(id: string) {
    const pricing = await this.prisma.pricing.findUnique({ where: { id } });
    if (!pricing) {
      throw new NotFoundException('Tarif non trouvé');
    }

    // Check if any licenses use this pricing
    const usageCount = await this.prisma.license.count({
      where: { pricingId: id },
    });

    if (usageCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce tarif: ${usageCount} licence(s) l'utilisent`,
      );
    }

    await this.prisma.pricing.delete({ where: { id } });
    return { message: 'Tarif supprimé avec succès' };
  }
}
