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
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { PersonsService } from "./persons.service";
import {
  CreatePersonDto,
  UpdatePersonDto,
  BatchCreatePersonDto,
} from "./persons.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role, PersonType } from "@prisma/client";

@ApiTags("Personnes")
@Controller("persons")
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Liste des personnes" })
  @ApiQuery({ name: "type", required: false, enum: PersonType })
  @ApiQuery({ name: "clubId", required: false })
  @ApiQuery({ name: "search", required: false })
  async findAll(
    @Query("type") type?: PersonType,
    @Query("clubId") clubId?: string,
    @Query("search") search?: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.personsService.findAll({ type, clubId, search }, user);
  }

  @Get("export")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Exporter les personnes en CSV" })
  @ApiQuery({ name: "clubId", required: false })
  @ApiQuery({ name: "type", required: false, enum: PersonType })
  async exportCsv(
    @Query("clubId") clubId: string,
    @Query("type") type: PersonType,
    @CurrentUser() user: { id: string; role: Role },
    @Res() res: Response,
  ) {
    const csv = await this.personsService.exportCsv({ clubId, type }, user);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="personnes.csv"',
    );
    res.send(csv);
  }

  @Get("by-display/:displayId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Trouver une personne par son displayId court" })
  async findByDisplayId(@Param("displayId") displayId: string) {
    return this.personsService.findByDisplayId(displayId);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Détails d'une personne" })
  async findOne(@Param("id") id: string) {
    return this.personsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Créer une personne" })
  async create(
    @Body() dto: CreatePersonDto,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.personsService.create(dto, user);
  }

  @Post("batch")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Creer plusieurs personnes en lot" })
  async batchCreate(
    @Body() body: any,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    // Accept both { persons: [...] } and raw array [...]
    const dto: BatchCreatePersonDto = Array.isArray(body) ? { persons: body } : body;
    return this.personsService.batchCreate(dto, user);
  }

  @Post("import-csv")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Importer des personnes depuis CSV" })
  async importCsv(
    @Body() body: { rows: any[] },
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.personsService.importCsv(body.rows, user);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Modifier une personne" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.personsService.update(id, dto, user);
  }

  @Patch(":id/transfer-no-auth")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Transferer un athlete sans autorisation -> licence type B" })
  async transferNoAuth(
    @Param("id") id: string,
    @Body() dto: { clubId: string },
  ) {
    return this.personsService.transferNoAuth(id, dto.clubId);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Supprimer une personne (admin)" })
  async delete(@Param("id") id: string) {
    return this.personsService.delete(id);
  }
}
