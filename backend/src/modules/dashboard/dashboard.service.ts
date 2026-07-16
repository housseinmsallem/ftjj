import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RegistrationStatus } from "@prisma/client";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalClubs,
      totalPersons,
      totalAthletes,
      totalCoaches,
      totalReferees,
      totalTechnicians,
      activeLicenses,
      pendingRegistrations,
      totalCompetitions,
      liveMatches,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.club.count({ where: { isActive: true } }),
      this.prisma.person.count(),
      this.prisma.person.count({ where: { type: "ATHLETE" } }),
      this.prisma.person.count({ where: { type: "COACH" } }),
      this.prisma.person.count({ where: { type: "REFEREE" } }),
      this.prisma.person.count({ where: { type: "TECHNICIAN" } }),
      this.prisma.license.count({ where: { isActive: true } }),
      this.prisma.registrationRequest.count({
        where: { status: RegistrationStatus.PENDING },
      }),
      this.prisma.competition.count(),
      this.prisma.match.count({ where: { status: "LIVE" } }),
    ]);

    return {
      data: {
        users: totalUsers,
        clubs: totalClubs,
        persons: {
          total: totalPersons,
          athletes: totalAthletes,
          coaches: totalCoaches,
          referees: totalReferees,
          technicians: totalTechnicians,
        },
        licenses: {
          active: activeLicenses,
        },
        registrations: {
          pending: pendingRegistrations,
        },
        competitions: {
          total: totalCompetitions,
          liveMatches: liveMatches,
        },
      },
    };
  }

  async getClubOwnerStats(userId: string) {
    const club = await this.prisma.club.findUnique({
      where: { ownerId: userId },
      include: { owner: { select: { id: true, email: true } } },
    });

    if (!club) {
      return {
        data: {
          message: "Aucun club associé à ce compte",
        },
      };
    }

    const [
      totalPersons,
      athletes,
      coaches,
      referees,
      technicians,
      activeLicenses,
      pendingRequests,
    ] = await Promise.all([
      this.prisma.person.count({ where: { clubId: club.id } }),
      this.prisma.person.count({ where: { clubId: club.id, type: "ATHLETE" } }),
      this.prisma.person.count({ where: { clubId: club.id, type: "COACH" } }),
      this.prisma.person.count({ where: { clubId: club.id, type: "REFEREE" } }),
      this.prisma.person.count({
        where: { clubId: club.id, type: "TECHNICIAN" },
      }),
      this.prisma.license.count({
        where: { isActive: true, person: { clubId: club.id } },
      }),
      this.prisma.registrationRequest.count({
        where: { clubId: club.id, status: RegistrationStatus.PENDING },
      }),
    ]);

    return {
      data: {
        club: { id: club.id, name: club.name, address: club.address },
        owner: { id: club.owner.id, email: club.owner.email },
        persons: {
          total: totalPersons,
          athletes,
          coaches,
          referees,
          technicians,
        },
        activeLicenses,
        pendingRequests,
      },
    };
  }
}
