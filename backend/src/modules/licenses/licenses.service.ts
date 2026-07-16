import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { Role, RegistrationStatus } from "@prisma/client";

@Injectable()
export class LicensesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(filters: {
    personId?: string;
    clubId?: string;
    isActive?: boolean;
    validatedByAdmin?: boolean;
  }) {
    const where: any = {};

    if (filters.personId) where.personId = filters.personId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.validatedByAdmin !== undefined)
      where.validatedByAdmin = filters.validatedByAdmin;
    if (filters.clubId) {
      where.person = { clubId: filters.clubId };
    }

    const licenses = await this.prisma.license.findMany({
      where,
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, type: true },
        },
        pricing: true,
        registrationRequest: true,
      },
      orderBy: { issuedAt: "desc" },
    });

    return { data: licenses };
  }

  async findOne(id: string) {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            type: true,
            club: { select: { id: true, name: true } },
          },
        },
        pricing: true,
        registrationRequest: true,
      },
    });

    if (!license) {
      throw new NotFoundException("Licence non trouvée");
    }

    return { data: license };
  }

  async createLicense(
    data: {
      personId: string;
      pricingId: string;
      paymentReceiptUrl?: string;
    },
    user?: { id: string; role: Role },
  ) {
    const person = await this.prisma.person.findUnique({
      where: { id: data.personId },
      include: { club: { include: { owner: true } } },
    });

    if (!person) {
      throw new NotFoundException("Personne non trouvée");
    }

    const pricing = await this.prisma.pricing.findUnique({
      where: { id: data.pricingId },
    });

    if (!pricing) {
      throw new NotFoundException("Tarif non trouvé");
    }

    // Check for existing active license of same type
    const existingActive = await this.prisma.license.findFirst({
      where: {
        personId: data.personId,
        pricingId: data.pricingId,
        isActive: true,
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        "Une licence active de ce type existe déjà pour cette personne",
      );
    }

    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Admin creates directly approved; Club owner creates pending request
    if (user && user.role === Role.ADMIN) {
      const license = await this.prisma.license.create({
        data: {
          personId: data.personId,
          pricingId: data.pricingId,
          expiryDate,
          paymentReceiptUrl: data.paymentReceiptUrl,
          validatedByAdmin: true,
          isActive: true,
        },
        include: { person: true, pricing: true },
      });

      return {
        message: "Licence créée et activée avec succès",
        data: license,
      };
    }

    // Club owner: create a pending registration request
    if (!person.clubId) {
      throw new BadRequestException(
        "La personne doit être rattachée à un club",
      );
    }
    const request = await this.prisma.registrationRequest.create({
      data: {
        clubId: person.clubId,
        personId: data.personId,
        licenseType: pricing.name,
        paymentReceiptUrl: data.paymentReceiptUrl,
        status: RegistrationStatus.PENDING,
      },
    });

    return {
      message:
        "Demande de licence soumise. En attente de validation par l'administration.",
      data: request,
    };
  }

  async getPendingRequests() {
    const requests = await this.prisma.registrationRequest.findMany({
      where: { status: RegistrationStatus.PENDING },
      include: {
        club: {
          select: { id: true, name: true, owner: { select: { email: true } } },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            photoUrl: true,
            identityDocumentUrl: true,
            birthCertificateUrl: true,
            identityDocumentType: true,
            athleteDetails: { select: { grade: true } },
            coachDetails: {
              select: {
                blackBeltAttestationUrl: true,
                coachingAttestationUrl: true,
                contractUrl: true,
              },
            },
            refereeDetails: { select: { refereeDegreeAttestationUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: requests };
  }

  async approveRequest(requestId: string, adminComment?: string) {
    const request = await this.prisma.registrationRequest.findUnique({
      where: { id: requestId },
      include: {
        person: true,
        club: { include: { owner: true } },
      },
    });

    if (!request) {
      throw new NotFoundException("Demande non trouvée");
    }

    if (request.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException("Cette demande a déjà été traitée");
    }

    // Find a matching pricing by name
    const pricing = await this.prisma.pricing.findFirst({
      where: { name: request.licenseType },
    });

    if (!pricing && request.personId) {
      throw new BadRequestException("Type de licence non reconnu");
    }

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create the license
    const license = await this.prisma.license.create({
      data: {
        personId: request.personId!,
        pricingId: pricing!.id,
        expiryDate,
        paymentReceiptUrl: request.paymentReceiptUrl,
        validatedByAdmin: true,
        isActive: true,
      },
    });

    // Update request status
    await this.prisma.registrationRequest.update({
      where: { id: requestId },
      data: {
        status: RegistrationStatus.APPROVED,
        adminComment: adminComment || null,
        reviewedAt: new Date(),
        licenseId: license.id,
      },
    });

    // Send approval email
    if (request.club?.owner?.email && request.person) {
      try {
        await this.emailService.sendRegistrationApprovedEmail(
          request.club.owner.email,
          `${request.person.firstName} ${request.person.lastName}`,
          request.licenseType,
        );
      } catch (error) {
        console.error("Échec d'envoi de l'email d'approbation:", error.message);
      }
    }

    return {
      message: "Demande approuvée et licence activée avec succès",
      data: license,
    };
  }

  async rejectRequest(requestId: string, adminComment: string) {
    const request = await this.prisma.registrationRequest.findUnique({
      where: { id: requestId },
      include: {
        person: true,
        club: { include: { owner: true } },
      },
    });

    if (!request) {
      throw new NotFoundException("Demande non trouvée");
    }

    if (request.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException("Cette demande a déjà été traitée");
    }

    await this.prisma.registrationRequest.update({
      where: { id: requestId },
      data: {
        status: RegistrationStatus.REJECTED,
        adminComment,
        reviewedAt: new Date(),
      },
    });

    // Send rejection email
    if (request.club?.owner?.email && request.person) {
      try {
        await this.emailService.sendRegistrationRejectedEmail(
          request.club.owner.email,
          `${request.person.firstName} ${request.person.lastName}`,
          adminComment,
        );
      } catch (error) {
        console.error("Échec d'envoi de l'email de refus:", error.message);
      }
    }

    return {
      message:
        "Demande refusée. Un email a été envoyé au propriétaire du club.",
    };
  }

  async renewLicense(licenseId: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundException("Licence non trouvée");
    }

    // Deactivate old license
    await this.prisma.license.update({
      where: { id: licenseId },
      data: { isActive: false },
    });

    // Create new license
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const newLicense = await this.prisma.license.create({
      data: {
        personId: license.personId,
        pricingId: license.pricingId,
        expiryDate,
        validatedByAdmin: true,
        isActive: true,
      },
    });

    return {
      message: "Licence renouvelée avec succès",
      data: newLicense,
    };
  }

  async deactivateLicense(licenseId: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundException("Licence non trouvée");
    }

    await this.prisma.license.update({
      where: { id: licenseId },
      data: { isActive: false },
    });

    return { message: "Licence désactivée avec succès" };
  }

  async getClubLicenses(clubId: string, user?: { id: string; role: Role }) {
    // Club owners can only see their own club's licenses
    if (user && user.role === Role.CLUB_OWNER) {
      const club = await this.prisma.club.findUnique({
        where: { ownerId: user.id },
      });
      if (!club || club.id !== clubId) {
        throw new ForbiddenException(
          "Vous n'avez pas accès aux licences de ce club",
        );
      }
    }

    return this.findAll({ clubId });
  }
}
