import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user?: { id: string; role: Role }) {
    const where: any = {};

    // Club owners only see their own club
    if (user && user.role === Role.CLUB_OWNER) {
      where.ownerId = user.id;
    }

    const clubs = await this.prisma.club.findMany({
      where,
      include: {
        owner: { select: { id: true, email: true } },
        _count: { select: { persons: true } },
      },
      orderBy: { name: "asc" },
    });

    return { data: clubs };
  }

  async findOne(id: string, user?: { id: string; role: Role }) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        documents: true,
        _count: { select: { persons: true } },
      },
    });

    if (!club) {
      throw new NotFoundException("Club non trouvé");
    }

    // Club owners can only see their own club
    if (user && user.role === Role.CLUB_OWNER && club.ownerId !== user.id) {
      throw new ForbiddenException("Vous n'avez pas accès à ce club");
    }

    return { data: club };
  }

  async create(data: { name: string; address?: string; ownerId: string }) {
    const club = await this.prisma.club.create({
      data: {
        name: data.name,
        address: data.address || null,
        ownerId: data.ownerId,
      },
    });

    return { message: "Club créé avec succès", data: club };
  }

  async update(
    id: string,
    data: { name?: string; address?: string; isActive?: boolean },
    user?: { id: string; role: Role },
  ) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club) {
      throw new NotFoundException("Club non trouvé");
    }

    if (user && user.role === Role.CLUB_OWNER && club.ownerId !== user.id) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que votre propre club",
      );
    }

    const updated = await this.prisma.club.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return { message: "Club mis à jour avec succès", data: updated };
  }

  async delete(id: string) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club) {
      throw new NotFoundException("Club non trouvé");
    }

    // Detach all persons — they become club-less instead of being deleted
    await this.prisma.person.updateMany({
      where: { clubId: id },
      data: { clubId: null },
    });

    await this.prisma.club.delete({ where: { id } });
    return {
      message:
        "Club supprimé avec succès. Les personnes associées ont été détachées.",
    };
  }

  async addDocument(
    clubId: string,
    fileName: string,
    fileUrl: string,
    fileType: string,
  ) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException("Club non trouvé");
    }

    const doc = await this.prisma.clubDocument.create({
      data: { clubId, fileName, fileUrl, fileType },
    });

    return { message: "Document ajouté avec succès", data: doc };
  }

  async removeDocument(documentId: string) {
    const doc = await this.prisma.clubDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException("Document non trouvé");
    }

    await this.prisma.clubDocument.delete({ where: { id: documentId } });
    return { message: "Document supprimé avec succès" };
  }
}
