import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { LoginDto, RegisterClubOwnerDto } from "./auth.dto";
import { Role, Gender, IdentityDocumentType, PersonType } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    if (!dto.email && !dto.username) {
      throw new BadRequestException("Email ou nom d'utilisateur requis");
    }

    const user = dto.username
      ? await this.prisma.user.findUnique({ where: { username: dto.username } })
      : await this.prisma.user.findUnique({ where: { email: dto.email! } });

    if (!user) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Email ou mot de passe incorrect");
    }

    if (!user.isApproved && user.role !== Role.ADMIN) {
      throw new UnauthorizedException(
        "Votre compte est en attente d'approbation par l'administration",
      );
    }

    return this.generateTokens(user);
  }

  async registerClubOwner(dto: RegisterClubOwnerDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("Un compte avec cet email existe déjà");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: Role.CLUB_OWNER,
        isApproved: false,
        club: {
          create: {
            name: dto.clubName,
            address: dto.clubAddress,
          },
        },
      },
      include: { club: true },
    });

    // Save uploaded documents with proper file type mapping
    if (dto.documents && user.club) {
      const documentTypeMap: Record<string, string> = {
        demandeInscription: "inscription_form",
        contratTravail: "work_contract",
        attestationBlackBelt: "black_belt_attestation",
        attestationCoaching: "coaching_attestation",
        copieJORT: "jort_copy",
        assuranceClub: "assurance",
      };

      for (const [key, url] of Object.entries(dto.documents)) {
        if (url && typeof url === "string") {
          await this.prisma.clubDocument.create({
            data: {
              clubId: user.club.id,
              fileName: url.split("/").pop() || "document",
              fileUrl: url,
              fileType: documentTypeMap[key] || "document",
            },
          });
        }
      }
    }

    return {
      message:
        "Votre demande d'inscription a été soumise. Elle sera examinée par l'administration.",
      data: {
        id: user.id,
        email: user.email,
        status: "En attente d'approbation",
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "Session expirée. Veuillez vous reconnecter.",
      );
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(stored.user);
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }
    return { message: "Déconnexion réussie" };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { club: true, referee: true },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    const { password, ...userWithoutPassword } = user;
    return { data: { user: userWithoutPassword } };
  }

  async registerReferee(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    arabicFirstName?: string;
    arabicLastName?: string;
    dateOfBirth: string;
    nationality?: string;
    gender: string;
    identityDocumentType: string;
    identityDocumentUrl?: string;
    photoUrl?: string;
    refereeDegreeAttestationUrl?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException("Cet email est déjà utilisé");

    // Validate date of birth
    const dob = new Date(data.dateOfBirth);
    if (isNaN(dob.getTime()) || dob.getFullYear() < 1900 || dob.getFullYear() > new Date().getFullYear()) {
      throw new BadRequestException("Date de naissance invalide");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: Role.REFEREE,
        isApproved: false,
      },
    });

    const person = await this.prisma.person.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        arabicFirstName: data.arabicFirstName,
        arabicLastName: data.arabicLastName,
        dateOfBirth: new Date(data.dateOfBirth),
        nationality: data.nationality || "Tunisienne",
        gender: data.gender as Gender,
        identityDocumentType: data.identityDocumentType as IdentityDocumentType,
        identityDocumentUrl: data.identityDocumentUrl,
        photoUrl: data.photoUrl,
        type: PersonType.REFEREE,
      },
    });

    await this.prisma.referee.create({
      data: {
        personId: person.id,
        refereeDegreeAttestationUrl: data.refereeDegreeAttestationUrl,
        userId: user.id,
      },
    });

    return {
      message: "Votre demande d'inscription a été soumise. Elle sera examinée par l'administration.",
    };
  }

  async getPendingRegistrations() {
    const pending = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.CLUB_OWNER, Role.REFEREE] },
        isApproved: false,
      },
      include: {
        club: { include: { documents: true } },
        referee: { include: { person: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true, nationality: true, identityDocumentType: true, identityDocumentUrl: true, birthCertificateUrl: true, photoUrl: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: pending.map(({ password, ...rest }) => rest),
    };
  }

  async approveRegistration(userId: string, adminComment?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { club: true },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    if (user.role !== Role.CLUB_OWNER && user.role !== Role.REFEREE) {
      throw new BadRequestException(
        "Cet utilisateur n'est ni un propriétaire de club ni un arbitre",
      );
    }

    if (user.isApproved) {
      throw new BadRequestException("Ce compte est déjà approuvé");
    }

    // Generate a temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        password: hashedPassword,
      },
    });

    // Send welcome email with temporary password
    try {
      const orgName = user.club?.name || "Arbitre FTJJ";
      await this.emailService.sendWelcomeEmail(
        user.email,
        temporaryPassword,
        orgName,
      );
    } catch (error) {
      console.error("Échec d'envoi de l'email de bienvenue:", error.message);
    }

    return {
      message:
        "Le compte a été approuvé avec succès. Un email a été envoyé au demandeur.",
    };
  }

  async rejectRegistration(userId: string, adminComment: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        club: true,
        referee: { include: { person: true } },
      },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    if (user.isApproved) {
      throw new BadRequestException("Ce compte est déjà approuvé");
    }

    // Send rejection email before deletion
    try {
      await this.emailService.sendRejectionEmail(
        user.email,
        adminComment || "Votre dossier ne répond pas aux critères requis.",
      );
    } catch (error) {
      console.error("Echec d'envoi de l'email de refus:", error.message);
    }

    // Delete the club first (club.ownerId references user, so user can't be deleted while club exists)
    if (user.club) {
      await this.prisma.clubDocument.deleteMany({ where: { clubId: user.club.id } }).catch(() => {});
      await this.prisma.club.delete({ where: { id: user.club.id } }).catch(() => {});
    }

    // Delete the referee's person record if it exists
    if (user.referee?.person?.id) {
      await this.prisma.person.delete({ where: { id: user.referee.person.id } }).catch(() => {});
    }

    // Delete the user (cascades to referee, etc.)
    await this.prisma.user.delete({ where: { id: userId } });

    return {
      message:
        "La demande d'inscription a ete refusee et supprimee. Un email a ete envoye au demandeur.",
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException("Le mot de passe actuel est incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: "Mot de passe changé avec succès" };
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRATION || "15m",
    });

    const refreshTokenValue = uuidv4();
    const refreshExpiration = new Date();
    refreshExpiration.setDate(refreshExpiration.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: refreshExpiration,
      },
    });

    const { password, ...userWithoutPassword } = user;

    return {
      data: {
        token: accessToken,
        refreshToken: refreshTokenValue,
        user: userWithoutPassword,
      },
    };
  }

  private generateTemporaryPassword(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
