import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getHome() {
    const [competitionsCount, clubsCount, athletesCount, upcomingCompetitions] =
      await Promise.all([
        this.prisma.competition.count(),
        this.prisma.club.count({ where: { isActive: true } }),
        this.prisma.person.count({ where: { type: 'ATHLETE' } }),
        this.prisma.competition.findMany({
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 5,
          select: { id: true, name: true, date: true, location: true },
        }),
      ]);

    return {
      data: {
        stats: {
          competitions: competitionsCount,
          clubs: clubsCount,
          athletes: athletesCount,
        },
        upcomingCompetitions,
      },
    };
  }

  async getCompetitions() {
    const competitions = await this.prisma.competition.findMany({
      where: { isPublic: true },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        name: true,
        date: true,
        location: true,
        description: true,
        type: true,
        splitByBelt: true,
        ageDivision: true,
        seasonYear: true,
        posterUrl: true,
        isPublic: true,
        _count: { select: { signups: true } },
      },
    });

    return { data: competitions };
  }

  async getRankings() {
    // Get persons with their active licenses for ranking display
    const athletes = await this.prisma.person.findMany({
      where: {
        type: 'ATHLETE',
        licenses: { some: { isActive: true } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        club: { select: { id: true, name: true } },
        athleteDetails: { select: { grade: true } },
      },
      take: 50,
    });

    return { data: athletes };
  }

  async getLive() {
    const liveMatches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.LIVE, MatchStatus.UPCOMING] },
      },
      include: {
        competition: { select: { id: true, name: true } },
        redCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
      orderBy: [{ matNumber: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    });

    const finishedMatches = await this.prisma.match.findMany({
      where: { status: MatchStatus.FINISHED },
      include: {
        competition: { select: { id: true, name: true } },
        redCorner: { select: { id: true, firstName: true, lastName: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return {
      data: {
        live: liveMatches,
        recentResults: finishedMatches,
      },
    };
  }

  async getAthletes(search?: string) {
    const where: any = { type: 'ATHLETE' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const athletes = await this.prisma.person.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        gender: true,
        club: { select: { id: true, name: true } },
        athleteDetails: { select: { grade: true } },
      },
      take: 50,
      orderBy: { lastName: 'asc' },
    });

    return { data: athletes };
  }

  async getClubs() {
    const clubs = await this.prisma.club.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        _count: { select: { persons: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { data: clubs };
  }

  async getCoaches(search?: string) {
    const where: any = { type: 'COACH' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const coaches = await this.prisma.person.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        club: { select: { id: true, name: true } },
      },
      take: 50,
      orderBy: { lastName: 'asc' },
    });

    return { data: coaches };
  }

  async getReferees(search?: string) {
    const where: any = { type: 'REFEREE' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const referees = await this.prisma.person.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        club: { select: { id: true, name: true } },
      },
      take: 50,
      orderBy: { lastName: 'asc' },
    });

    return { data: referees };
  }

  async getNews() {
    const articles = await this.prisma.article.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        excerpt: true,
        category: true,
        imageUrl: true,
        publishedAt: true,
      },
    });
    return { data: articles };
  }
}
