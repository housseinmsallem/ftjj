import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "default-secret",
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("Utilisateur non trouvé");
    }

    if (!user.isApproved && user.role !== "ADMIN") {
      throw new UnauthorizedException(
        "Votre compte est en attente d'approbation",
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
    };
  }
}
