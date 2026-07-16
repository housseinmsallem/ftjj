import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role, { message: 'Rôle invalide' })
  role: Role;
}

@ApiTags('Utilisateurs')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Liste de tous les utilisateurs' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Détails d\'un utilisateur' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Modifier le rôle d\'un utilisateur' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Patch(':id/toggle-approval')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approuver/Désapprouver un compte' })
  async toggleApproval(@Param('id') id: string) {
    return this.usersService.toggleApproval(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
