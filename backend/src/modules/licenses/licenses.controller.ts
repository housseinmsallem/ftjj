import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateLicenseDto {
  @ApiProperty()
  @IsUUID('4', { message: "L'ID de la personne est invalide" })
  personId: string;

  @ApiProperty()
  @IsUUID('4', { message: "L'ID du tarif est invalide" })
  pricingId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentReceiptUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  medicalCertificateUrl?: string;
}

class ApproveRejectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminComment?: string;
}

@ApiTags('Licences')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des licences' })
  @ApiQuery({ name: 'personId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @Query('personId') personId?: string,
    @Query('isActive') isActive?: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.licensesService.findAll({
      personId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('pending-requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Demandes de licence en attente (admin)' })
  async getPendingRequests() {
    return this.licensesService.getPendingRequests();
  }

  @Get('club/:clubId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Licences d\'un club' })
  async getClubLicenses(
    @Param('clubId') clubId: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.licensesService.getClubLicenses(clubId, user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Détails d\'une licence' })
  async findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Créer une licence ou soumettre une demande' })
  async create(
    @Body() dto: CreateLicenseDto,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.licensesService.createLicense(dto, user);
  }

  @Patch('request/:id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approuver une demande de licence (admin)' })
  async approveRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.licensesService.approveRequest(id, dto.adminComment);
  }

  @Patch('request/:id/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Refuser une demande de licence (admin)' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    if (!dto.adminComment) {
      return {
        statusCode: 400,
        message: 'Le motif du refus est obligatoire',
      };
    }
    return this.licensesService.rejectRequest(id, dto.adminComment);
  }

  @Post(':id/renew')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Renouveler une licence (admin)' })
  async renew(@Param('id') id: string) {
    return this.licensesService.renewLicense(id);
  }

  @Patch(':id/deactivate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Désactiver une licence (admin)' })
  async deactivate(@Param('id') id: string) {
    return this.licensesService.deactivateLicense(id);
  }

  @Post('deactivate-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Désactiver toutes les licences pour la nouvelle saison (admin)' })
  async deactivateAll() {
    return this.licensesService.deactivateAllLicenses();
  }
}
