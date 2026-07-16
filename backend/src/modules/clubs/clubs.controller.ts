import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClubsService } from './clubs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateClubDto {
  @ApiProperty({ example: 'Club Sportif Tunis' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

class UpdateClubDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des clubs' })
  async findAll(@CurrentUser() user: { id: string; role: Role }) {
    return this.clubsService.findAll(user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Détails d\'un club' })
  async findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: Role }) {
    return this.clubsService.findOne(id, user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Créer un club (admin)' })
  async create(@Body() dto: CreateClubDto, @CurrentUser('id') userId: string) {
    return this.clubsService.create({ ...dto, ownerId: userId });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Modifier un club' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClubDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.clubsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un club (admin)' })
  async delete(@Param('id') id: string) {
    return this.clubsService.delete(id);
  }
}
