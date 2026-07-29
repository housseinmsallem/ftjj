import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  LoginDto,
  RegisterClubOwnerDto,
  RefreshTokenDto,
  ApproveRejectRegistrationDto,
  ChangePasswordDto,
} from './auth.dto';
import { Role } from '@prisma/client';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register/club-owner')
  @ApiOperation({ summary: "Inscription d'un propriétaire de club" })
  async registerClubOwner(@Body() dto: RegisterClubOwnerDto) {
    return this.authService.registerClubOwner(dto);
  }

  @Post('register-referee')
  @ApiOperation({ summary: "Inscription d'un arbitre (compte en attente d'approbation)" })
  async registerReferee(@Body() body: {
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
    birthCertificateUrl?: string;
    photoUrl?: string;
    refereeDegreeAttestationUrl?: string;
  }) {
    return this.authService.registerReferee(body);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rafraîchir le token JWT' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Déconnexion' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Profil utilisateur connecté' })
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Changer le mot de passe' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  // --- Admin: Registration Management ---

  @Get('admin/pending-registrations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Liste des inscriptions en attente' })
  async getPendingRegistrations() {
    return this.authService.getPendingRegistrations();
  }

  @Post('admin/approve-registration/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Approuver l'inscription d'un club" })
  async approveRegistration(
    @Param('userId') userId: string,
    @Body() dto: ApproveRejectRegistrationDto,
  ) {
    return this.authService.approveRegistration(userId, dto.adminComment);
  }

  @Post('admin/reject-registration/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Refuser l'inscription d'un club" })
  async rejectRegistration(
    @Param('userId') userId: string,
    @Body() dto: ApproveRejectRegistrationDto,
  ) {
    if (!dto.adminComment) {
      return {
        statusCode: 400,
        message: 'Le motif du refus est obligatoire',
      };
    }
    return this.authService.rejectRegistration(userId, dto.adminComment);
  }
}
