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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role, PersonType, RegistrationStatus } from "@prisma/client";
import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { AgeDivision, getWeightCategories } from "../../common/utils/age-division";

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

  @ApiProperty({ required: false, example: ["ADULTS", "U21"] })
  @IsOptional()
  ageDivisions?: string[];

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

  @ApiProperty({ required: false })
  @IsOptional()
  ageDivisions?: string[];

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

  @ApiProperty({ required: false, example: 73 })
  @IsOptional()
  weight?: number;

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
  async signup(@Body() dto: CompetitionSignupDto, @CurrentUser() user?: { id: string; role: string }) {
    return this.competitionsService.signup(dto, user);
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

  @Patch('signups/:id/weight')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Modifier le poids d'une inscription" })
  async updateWeight(@Param('id') id: string, @Body() body: { weight: number }) {
    return this.competitionsService.updateSignupWeight(id, body.weight);
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

  @Get(':id/mats')
  @ApiOperation({ summary: 'Liste des tapis' })
  async getMats(@Param('id') id: string) {
    return this.competitionsService.getMats(id);
  }

  @Post(':id/mats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ajouter un tapis' })
  async createMat(@Param('id') id: string, @Body() body: { name: string; number: number }) {
    return this.competitionsService.createMat(id, body.name, body.number);
  }

  @Patch(':id/mats/:matId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Modifier un tapis' })
  async updateMat(@Param('matId') matId: string, @Body() body: { name?: string; number?: number }) {
    return this.competitionsService.updateMat(matId, body);
  }

  @Delete(':id/mats/:matId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un tapis' })
  async deleteMat(@Param('matId') matId: string) {
    return this.competitionsService.deleteMat(matId);
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
    @Body() body: { athleteIds: string[]; matId?: string },
  ) {
    return this.competitionsService.generateMatches(id, body.athleteIds, body.matId);
  }

  @Post(':id/moderation-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Générer un token de modération' })
  async generateModerationToken(@Param('id') id: string) {
    return this.competitionsService.generateModerationToken(id);
  }

  @Get(':id/moderate')
  @ApiOperation({ summary: 'Vue de modération (publique avec token)' })
  async moderateView(@Param('id') id: string, @Query('token') token: string) {
    return this.competitionsService.getModerationView(id, token);
  }

  @Patch('moderate/:id/signups/:signupId/weight')
  @ApiOperation({ summary: 'Modifier le poids (modération publique)' })
  async moderateUpdateWeight(
    @Param('id') id: string,
    @Param('signupId') signupId: string,
    @Query('token') token: string,
    @Body() body: { weight: number },
  ) {
    return this.competitionsService.moderateUpdateWeight(id, token, signupId, body.weight);
  }

  @Patch('moderate/:id/matches/:matchId')
  @ApiOperation({ summary: 'Modifier un score de match (modération publique)' })
  async moderateUpdateMatch(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Query('token') token: string,
    @Body() body: { redScore?: number; blueScore?: number; warningsRed?: number; penaltiesRed?: number; warningsBlue?: number; penaltiesBlue?: number; status?: string; winMethod?: string; winnerSide?: string },
  ) {
    return this.competitionsService.moderateUpdateMatchScore(id, token, matchId, body);
  }

  @Post('moderate/:id/generate-brackets')
  @ApiOperation({ summary: 'Générer les brackets (modération publique)' })
  async moderateGenerateBrackets(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    return this.competitionsService.moderateGenerateBrackets(id, token);
  }

  @Post('moderate/:id/generate-matches')
  @ApiOperation({ summary: 'Générer les matchs (modération publique)' })
  async moderateGenerateMatches(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() body: { athleteIds: string[]; matId?: string },
  ) {
    return this.competitionsService.moderateGenerateMatches(id, token, body.athleteIds, body.matId);
  }

  @Post('moderate/:id/mats')
  @ApiOperation({ summary: 'Ajouter un tapis (modération publique)' })
  async moderateCreateMat(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() body: { name: string; number: number },
  ) {
    return this.competitionsService.moderateCreateMat(id, token, body.name, body.number);
  }

  @Delete('moderate/:id/mats/:matId')
  @ApiOperation({ summary: 'Supprimer un tapis (modération publique)' })
  async moderateDeleteMat(
    @Param('id') id: string,
    @Param('matId') matId: string,
    @Query('token') token: string,
  ) {
    return this.competitionsService.moderateDeleteMat(id, token, matId);
  }

  @Delete('moderate/:id/matches/reset')
  @ApiOperation({ summary: 'Réinitialiser tous les matchs (modération publique)' })
  async moderateResetMatches(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    return this.competitionsService.moderateResetMatches(id, token);
  }

  @Post('moderate/:id/next-round')
  @ApiOperation({ summary: 'Générer le tour suivant (modération publique)' })
  async moderateNextRound(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() body: { currentRound: number },
  ) {
    return this.competitionsService.moderateGenerateNextRound(id, token, '', body.currentRound);
  }

  @Get("weight-categories/:ageDivision/:gender")
  @ApiOperation({ summary: "Catégories de poids pour une division et un genre" })
  async getWeightCategories(
    @Param("ageDivision") ageDivision: AgeDivision,
    @Param("gender") gender: string,
  ) {
    return { data: getWeightCategories(ageDivision, gender) };
  }

  @Post('moderate/:id/toggle-close')
  @ApiOperation({ summary: 'Clôturer / rouvrir la compétition' })
  async moderateToggleClose(@Param('id') id: string, @Query('token') token: string) {
    return this.competitionsService.moderateToggleClose(id, token);
  }

  @Patch('moderate/:id/matches/:matchId/replace')
  @ApiOperation({ summary: 'Remplacer un athlète dans un match' })
  async moderateReplaceAthlete(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Query('token') token: string,
    @Body() body: { side: 'red' | 'blue'; newPersonId: string },
  ) {
    return this.competitionsService.moderateReplaceAthlete(id, token, matchId, body.side, body.newPersonId);
  }
}
