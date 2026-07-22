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
import { Role } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException("Email ou mot de passe incorrect");
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
      include: { club: true },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    const { password, ...userWithoutPassword } = user;
    return { data: { user: userWithoutPassword } };
  }

  async getPendingRegistrations() {
    const pending = await this.prisma.user.findMany({
      where: {
        role: Role.CLUB_OWNER,
        isApproved: false,
      },
      include: { club: { include: { documents: true } } },
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

    if (user.role !== Role.CLUB_OWNER) {
      throw new BadRequestException(
        "Cet utilisateur n'est pas un propriétaire de club",
      );
    }

    if (user.isApproved) {
      throw new BadRequestException("Ce compte est déjà approuvé");
    }

    // Generate a temporary password for the club owner
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
      await this.emailService.sendWelcomeEmail(
        user.email,
        temporaryPassword,
        user.club?.name || "Club",
      );
    } catch (error) {
      console.error("Échec d'envoi de l'email de bienvenue:", error.message);
    }

    return {
      message:
        "Le compte a été approuvé avec succès. Un email a été envoyé au propriétaire du club.",
    };
  }

  async rejectRegistration(userId: string, adminComment: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { club: true },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    if (user.isApproved) {
      throw new BadRequestException("Ce compte est déjà approuvé");
    }

    // Send rejection email
    try {
      await this.emailService.sendRejectionEmail(
        user.email,
        adminComment || "Votre dossier ne répond pas aux critères requis.",
      );
    } catch (error) {
      console.error("Échec d'envoi de l'email de refus:", error.message);
    }

    // Optionally delete the user or just keep rejected
    // For audit purposes, we'll keep the user but they remain unapproved
    return {
      message:
        "La demande d'inscription a été refusée. Un email a été envoyé au demandeur.",
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
