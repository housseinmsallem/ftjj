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
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CompetitionsService } from "./competitions.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role, PersonType, RegistrationStatus, AgeDivision } from "@prisma/client";
import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { getWeightCategories } from "../../common/utils/age-division";

class CreateCompetitionDto {
  @ApiProperty({ example: "Championnat National 2025" })
  @IsString()
  name: string;

  @ApiProperty({ example: "2025-06-15" })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false, example: "Salle Omnisports, Tunis" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, enum: ["Open", "Championship"] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  splitByBelt?: boolean;

  @ApiProperty({ required: false, enum: AgeDivision, default: AgeDivision.ADULTS })
  @IsOptional()
  @IsEnum(AgeDivision)
  ageDivision?: AgeDivision;

  @ApiProperty({ required: false, example: 2026 })
  @IsOptional()
  @IsNumber()
  seasonYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  posterUrl?: string;
}

class UpdateCompetitionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, enum: ["Open", "Championship"] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  splitByBelt?: boolean;

  @ApiProperty({ required: false, enum: AgeDivision })
  @IsOptional()
  @IsEnum(AgeDivision)
  ageDivision?: AgeDivision;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  seasonYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  posterUrl?: string;
}

class CompetitionSignupDto {
  @ApiProperty()
  @IsUUID("4")
  competitionId: string;

  @ApiProperty()
  @IsUUID("4")
  personId: string;

  @ApiProperty({ enum: PersonType })
  @IsEnum(PersonType)
  type: PersonType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentReceiptUrl?: string;
}

class UpdateSignupStatusDto {
  @ApiProperty({ enum: RegistrationStatus })
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;
}

@ApiTags("Compétitions")
@Controller("competitions")
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Get()
  @ApiOperation({ summary: "Liste des compétitions" })
  async findAll() {
    return this.competitionsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Détails d'une compétition" })
  async findOne(@Param("id") id: string) {
    return this.competitionsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Créer une compétition (admin)" })
  async create(@Body() dto: CreateCompetitionDto) {
    return this.competitionsService.create(dto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Modifier une compétition (admin)" })
  async update(@Param("id") id: string, @Body() dto: UpdateCompetitionDto) {
    return this.competitionsService.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Supprimer une compétition (admin)" })
  async delete(@Param("id") id: string) {
    return this.competitionsService.delete(id);
  }

  @Post("signups")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Inscrire une personne à une compétition" })
  async signup(@Body() dto: CompetitionSignupDto) {
    return this.competitionsService.signup(dto);
  }

  @Patch("signups/:id/status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Modifier le statut d'une inscription" })
  async updateSignupStatus(
    @Param("id") id: string,
    @Body() dto: UpdateSignupStatusDto,
  ) {
    return this.competitionsService.updateSignupStatus(id, dto.status);
  }

  @Post(":id/documents")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Ajouter un document à une compétition" })
  async addDocument(
    @Param("id") id: string,
    @Body() body: { fileName: string; fileUrl: string },
  ) {
    return this.competitionsService.addDocument(id, body.fileName, body.fileUrl);
  }

  @Delete(":id/documents/:docId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Supprimer un document" })
  async removeDocument(@Param("docId") docId: string) {
    return this.competitionsService.removeDocument(docId);
  }

  @Post(":id/generate-brackets")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Générer les brackets (catégories) pour une compétition" })
  async generateBrackets(@Param("id") id: string) {
    return this.competitionsService.generateBrackets(id);
  }

  @Post(':id/generate-matches')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Générer les matchs pour une catégorie' })
  async generateMatches(
    @Param('id') id: string,
    @Body() body: { athleteIds: string[]; matStart?: number },
  ) {
    return this.competitionsService.generateMatches(id, body.athleteIds, body.matStart);
  }

  @Get("weight-categories/:ageDivision/:gender")
  @ApiOperation({ summary: "Catégories de poids pour une division et un genre" })
  async getWeightCategories(
    @Param("ageDivision") ageDivision: AgeDivision,
    @Param("gender") gender: string,
  ) {
    return { data: getWeightCategories(ageDivision, gender) };
  }
}
