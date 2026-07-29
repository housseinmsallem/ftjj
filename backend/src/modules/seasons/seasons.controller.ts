import { Controller, Get, Post, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SeasonsService } from "./seasons.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";

@ApiTags("seasons")
@Controller("seasons")
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  @ApiOperation({ summary: "Liste toutes les saisons" })
  async findAll() {
    return this.seasonsService.findAll();
  }

  @Get("current")
  @ApiOperation({ summary: "Récupère la saison courante" })
  async getCurrent() {
    return this.seasonsService.getCurrent();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Créer une nouvelle saison" })
  async create(@Body() body: { name: string; startsAt: string; endsAt: string; registrationClosesAt?: string }) {
    return this.seasonsService.create(body.name, body.startsAt, body.endsAt, body.registrationClosesAt);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Modifier une saison" })
  async update(@Param("id") id: string, @Body() body: { name?: string; startsAt?: string; endsAt?: string; registrationClosesAt?: string | null }) {
    return this.seasonsService.update(id, body);
  }

  @Patch(":id/activate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Activer une saison (désactive les autres)" })
  async activate(@Param("id") id: string) {
    return this.seasonsService.activate(id);
  }
}
