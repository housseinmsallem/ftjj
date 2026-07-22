import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';
import { getAgeDivision, getAgeDivisionLabel, getWeightCategory, getBeltGroup, getNextHigherAgeDivision, getNextHigherWeightCategory, getNextHigherBelt, AgeDivision } from '../../common/utils/age-division';

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
        id: true, name: true, date: true, location: true, description: true,
        type: true, splitByBelt: true, ageDivisions: true, seasonYear: true,
        posterUrl: true, isPublic: true, isClosed: true,
        _count: { select: { signups: true, matches: true } },
      },
    });

    const now = new Date();
    const enriched = competitions.map(c => ({
      ...c,
      isRegistrationOpen: now < new Date(new Date(c.date).getTime() - 2 * 86400000),
    }));

    enriched.sort((a, b) => {
      const aLive = !a.isClosed && new Date(a.date) >= now ? 0 : 1;
      const bLive = !b.isClosed && new Date(b.date) >= now ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return { data: enriched };
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
      orderBy: { createdAt: 'asc' },
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
        dateOfBirth: true,
        nationality: true,
        photoUrl: true,
        achievements: true,
        gender: true,
        type: true,
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

  async getCompetitionDetail(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId, isPublic: true },
      include: {
        mats: { orderBy: { number: 'asc' } },
        signups: {
          where: { status: 'APPROVED', type: 'ATHLETE' },
          include: {
            person: {
              select: {
                id: true, firstName: true, lastName: true,
                dateOfBirth: true, gender: true, photoUrl: true,
                club: { select: { id: true, name: true } },
                athleteDetails: { select: { grade: true, weight: true } },
              },
            },
          },
        },
        matches: {
          include: {
            mat: { select: { id: true, name: true, number: true } },
            redCorner: { select: { id: true, firstName: true, lastName: true } },
            blueCorner: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }],
        },
      },
    });

    if (!competition) throw new NotFoundException('Compétition non trouvée');

    const approvedSignups = competition.signups;
    const isIBJJF = competition.splitByBelt === true;
    const seasonYear = competition.seasonYear || 2026;
    const compAgeDivisions = competition.ageDivisions || [];

    // Build categories with metadata for promotion
    const categoriesMeta: {
      name: string; athletes: string[]; ageDiv: string; gender: string; weightCat: string; belt?: string;
    }[] = [];

    if (approvedSignups.length > 0) {
      const byAge: Record<string, typeof approvedSignups> = {};
      for (const s of approvedSignups) {
        const ageDiv = getAgeDivision(new Date(s.person.dateOfBirth).getFullYear(), seasonYear, competition.date);
        if (compAgeDivisions.length === 0 || compAgeDivisions.includes(ageDiv)) {
          if (!byAge[ageDiv]) byAge[ageDiv] = [];
          byAge[ageDiv].push(s);
        }
      }
      for (const [ageDiv, adAthletes] of Object.entries(byAge)) {
        const byGender: Record<string, typeof approvedSignups> = {};
        for (const s of adAthletes) { const g = s.person.gender || 'MALE'; if (!byGender[g]) byGender[g] = []; byGender[g].push(s); }
        for (const [gender, athletes] of Object.entries(byGender)) {
          const byWeight: Record<string, typeof approvedSignups> = {};
          for (const a of athletes) {
            const wc = getWeightCategory(a.weight ?? a.person.athleteDetails?.weight, gender, ageDiv);
            if (!byWeight[wc]) byWeight[wc] = []; byWeight[wc].push(a);
          }
          for (const [wc, wAthletes] of Object.entries(byWeight)) {
            if (isIBJJF) {
              const byBelt: Record<string, typeof approvedSignups> = {};
              for (const a of wAthletes) {
                const belt = getBeltGroup(a.person.athleteDetails?.grade || 'WHITE');
                if (!byBelt[belt]) byBelt[belt] = []; byBelt[belt].push(a);
              }
              for (const [belt, bAthletes] of Object.entries(byBelt)) {
                categoriesMeta.push({ name: `${getAgeDivisionLabel(ageDiv as any)} ${gender === 'MALE' ? 'Hommes' : 'Femmes'} ${wc} - ${belt}`, athletes: bAthletes.map((a: any) => a.personId), ageDiv, gender, weightCat: wc, belt });
              }
            } else {
              categoriesMeta.push({ name: `${getAgeDivisionLabel(ageDiv as any)} ${gender === 'MALE' ? 'Hommes' : 'Femmes'} ${wc}`, athletes: wAthletes.map((a: any) => a.personId), ageDiv, gender, weightCat: wc });
            }
          }
        }
      }
    }

    // ── Lone Athlete Promotion ──
    const promoted = new Set<string>(); let changed = true;
    while (changed) {
      changed = false;
      for (const cat of categoriesMeta) {
        if (cat.athletes.length >= 2 || cat.athletes.length === 0) continue;
        const loneId = cat.athletes[0]; if (promoted.has(loneId)) continue;
        let ok = false;
        const nw = getNextHigherWeightCategory(cat.weightCat, cat.gender, cat.ageDiv);
        if (nw && !ok) { const t = categoriesMeta.find(c => c.ageDiv === cat.ageDiv && c.gender === cat.gender && c.weightCat === nw && (isIBJJF ? c.belt === cat.belt : true) && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } }
        if (!ok) { const na = getNextHigherAgeDivision(cat.ageDiv as AgeDivision); if (na && (compAgeDivisions.length === 0 || compAgeDivisions.includes(na))) { const t = categoriesMeta.find(c => c.ageDiv === na && c.gender === cat.gender && c.weightCat === cat.weightCat && (isIBJJF ? c.belt === cat.belt : true) && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } } }
        if (!ok) { const na = getNextHigherAgeDivision(cat.ageDiv as AgeDivision); const nw2 = getNextHigherWeightCategory(cat.weightCat, cat.gender, cat.ageDiv); if (na && nw2 && (compAgeDivisions.length === 0 || compAgeDivisions.includes(na))) { const t = categoriesMeta.find(c => c.ageDiv === na && c.gender === cat.gender && c.weightCat === nw2 && (isIBJJF ? c.belt === cat.belt : true) && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } } }
        if (!ok && isIBJJF && cat.belt) { const nb = getNextHigherBelt(cat.belt); if (nb) { const t = categoriesMeta.find(c => c.ageDiv === cat.ageDiv && c.gender === cat.gender && c.weightCat === cat.weightCat && c.belt === nb && c !== cat); if (t) { t.athletes.push(loneId); cat.athletes = []; promoted.add(loneId); ok = true; changed = true; } } }
      }
    }

    const categories = categoriesMeta
      .filter(c => c.athletes.length > 0)
      .map(c => ({ name: c.name, athletes: c.athletes }));

    const categoryMatches: Record<string, any[]> = {};
    for (const cat of categories) {
      const athleteIdSet = new Set(cat.athletes);
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
        isRegistrationOpen: new Date() < new Date(new Date(competition.date).getTime() - 2 * 86400000),
        brackets: { categories, totalAthletes: approvedSignups.length, splitByBelt: isIBJJF },
        categoryMatches,
      },
    };
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
