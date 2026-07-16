import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { MatchesGateway } from './matches.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, MatchStatus } from '@prisma/client';
import { IsString, IsUUID, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateMatchDto {
  @ApiProperty()
  @IsUUID('4')
  competitionId: string;

  @ApiProperty()
  @IsUUID('4')
  redCornerId: string;

  @ApiProperty()
  @IsUUID('4')
  blueCornerId: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  matNumber?: number;
}

class UpdateScoreDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  redScore?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  blueScore?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  warningsRed?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  penaltiesRed?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  warningsBlue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  penaltiesBlue?: number;
}

class UpdateStatusDto {
  @ApiProperty({ enum: MatchStatus })
  @IsEnum(MatchStatus)
  status: MatchStatus;
}

class FinishMatchDto {
  @ApiProperty({ example: 'red' })
  @IsString()
  winnerSide: string;

  @ApiProperty({ example: 'points' })
  @IsString()
  winMethod: string;
}

@ApiTags('Matchs')
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchesGateway: MatchesGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste des matchs' })
  @ApiQuery({ name: 'competitionId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: MatchStatus })
  async findAll(
    @Query('competitionId') competitionId?: string,
    @Query('status') status?: MatchStatus,
  ) {
    return this.matchesService.findAll({ competitionId, status });
  }

  @Get('live')
  @ApiOperation({ summary: 'Matchs en direct (accès public)' })
  async findLive() {
    return this.matchesService.findLive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un match' })
  async findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Créer un match (admin)' })
  async create(@Body() dto: CreateMatchDto) {
    const result = await this.matchesService.create(dto);
    return result;
  }

  @Patch(':id/score')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour le score d\'un match en direct' })
  async updateScore(@Param('id') id: string, @Body() dto: UpdateScoreDto) {
    const result = await this.matchesService.updateScore(id, dto);
    // Broadcast to spectators
    this.matchesGateway.broadcastMatchUpdate(id, result.data);
    return result;
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Changer le statut d\'un match' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    const result = await this.matchesService.updateStatus(id, dto.status);
    this.matchesGateway.broadcastMatchStatus(id, dto.status);
    if (dto.status === MatchStatus.LIVE) {
      this.matchesGateway.broadcastMatchUpdate(id, result.data);
    }
    return result;
  }

  @Post(':id/finish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Terminer un match' })
  async finishMatch(@Param('id') id: string, @Body() dto: FinishMatchDto) {
    const result = await this.matchesService.finishMatch(id, dto.winnerSide, dto.winMethod);
    this.matchesGateway.broadcastMatchUpdate(id, result.data);
    return result;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un match (admin)' })
  async delete(@Param('id') id: string) {
    return this.matchesService.delete(id);
  }
}
