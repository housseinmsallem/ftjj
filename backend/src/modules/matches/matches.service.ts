import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { competitionId?: string; status?: MatchStatus }) {
    const where: any = {};
    if (filters.competitionId) where.competitionId = filters.competitionId;
    if (filters.status) where.status = filters.status;

    const matches = await this.prisma.match.findMany({
      where,
      include: {
        competition: { select: { id: true, name: true } },
        redCorner: { select: { id: true, firstName: true, lastName: true, type: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true, type: true } },
      },
      orderBy: { createdAt: 'asc' }
    });

    return { data: matches };
  }

  async findLive() {
    return this.findAll({ status: MatchStatus.LIVE });
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        competition: { select: { id: true, name: true, date: true } },
        redCorner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            photoUrl: true,
            club: { select: { id: true, name: true } },
          },
        },
        blueCorner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            photoUrl: true,
            club: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match non trouvé');
    }

    return { data: match };
  }

  async create(data: {
    competitionId: string;
    redCornerId: string;
    blueCornerId: string;
  }) {
    if (data.redCornerId === data.blueCornerId) {
      throw new NotFoundException('Les deux combattants ne peuvent pas être la même personne');
    }

    const match = await this.prisma.match.create({
      data: {
        competitionId: data.competitionId,
        redCornerId: data.redCornerId,
        blueCornerId: data.blueCornerId,
        status: MatchStatus.UPCOMING,
      },
      include: {
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { message: 'Match créé avec succès', data: match };
  }

  async updateScore(
    id: string,
    data: {
      redScore?: number;
      blueScore?: number;
      warningsRed?: number;
      penaltiesRed?: number;
      warningsBlue?: number;
      penaltiesBlue?: number;
    },
  ) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) {
      throw new NotFoundException('Match non trouvé');
    }

    if (match.status !== MatchStatus.LIVE) {
      throw new NotFoundException('Le match doit être en cours pour modifier le score');
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data,
      include: {
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
        competition: { select: { id: true, name: true } },
      },
    });

    return { message: 'Score mis à jour', data: updated };
  }

  async updateStatus(id: string, status: MatchStatus) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) {
      throw new NotFoundException('Match non trouvé');
    }

    const updateData: any = { status };

    if (status === MatchStatus.LIVE) {
      updateData.redScore = 0;
      updateData.blueScore = 0;
      updateData.warningsRed = 0;
      updateData.penaltiesRed = 0;
      updateData.warningsBlue = 0;
      updateData.penaltiesBlue = 0;
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
        competition: { select: { id: true, name: true } },
      },
    });

    return { message: `Statut du match mis à jour: ${status}`, data: updated };
  }

  async finishMatch(id: string, winnerSide: string, winMethod: string) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) {
      throw new NotFoundException('Match non trouvé');
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data: {
        status: MatchStatus.FINISHED,
        winnerSide,
        winMethod,
      },
      include: {
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
        competition: { select: { id: true, name: true } },
      },
    });

    // Auto-advance winner to next bracket round
    await this.advanceWinner(id);

    return { message: 'Match terminé', data: updated };
  }

  private async advanceWinner(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { redCornerId: true, blueCornerId: true, winnerSide: true, round: true, bracketPosition: true, competitionId: true },
    });
    if (!match || !match.winnerSide) return;

    const winnerId = match.winnerSide === 'red' ? match.redCornerId : match.blueCornerId;
    if (!winnerId) return;

    const nextPos = Math.ceil((match.bracketPosition || 1) / 2);
    const nextMatch = await this.prisma.match.findFirst({
      where: {
        competitionId: match.competitionId,
        round: match.round + 1,
        bracketPosition: nextPos,
      },
    });

    if (!nextMatch) return;

    const isRed = (match.bracketPosition || 1) % 2 === 1;
    await this.prisma.match.update({
      where: { id: nextMatch.id },
      data: isRed ? { redCornerId: winnerId } : { blueCornerId: winnerId },
    });
  }

  async delete(id: string) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) {
      throw new NotFoundException('Match non trouvé');
    }

    await this.prisma.match.delete({ where: { id } });
    return { message: 'Match supprimé avec succès' };
  }
}
