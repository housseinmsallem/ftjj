import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegistrationStatus } from '@prisma/client';

@ApiTags('Demandes d\'inscription')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des demandes d\'inscription' })
  @ApiQuery({ name: 'status', required: false, enum: RegistrationStatus })
  async findAll(@Query('status') status?: RegistrationStatus) {
    return this.registrationsService.findAll(status);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Détails d\'une demande' })
  async findOne(@Param('id') id: string) {
    return this.registrationsService.findOne(id);
  }
}
