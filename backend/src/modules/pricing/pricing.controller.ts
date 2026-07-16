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
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, LicenseCategory } from '@prisma/client';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreatePricingDto {
  @ApiProperty({ example: 'Inscription Annuelle' })
  @IsString()
  name: string;

  @ApiProperty({ example: 120 })
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: LicenseCategory })
  @IsEnum(LicenseCategory)
  category: LicenseCategory;
}

class UpdatePricingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ required: false, enum: LicenseCategory })
  @IsOptional()
  @IsEnum(LicenseCategory)
  category?: LicenseCategory;
}

@ApiTags('Tarifs')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des tarifs' })
  @ApiQuery({ name: 'category', required: false, enum: LicenseCategory })
  async findAll(@Query('category') category?: LicenseCategory) {
    if (category) {
      return this.pricingService.findByCategory(category);
    }
    return this.pricingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un tarif' })
  async findOne(@Param('id') id: string) {
    return this.pricingService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Créer un tarif (admin)' })
  async create(@Body() dto: CreatePricingDto) {
    return this.pricingService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Modifier un tarif (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePricingDto) {
    return this.pricingService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un tarif (admin)' })
  async delete(@Param('id') id: string) {
    return this.pricingService.delete(id);
  }
}
