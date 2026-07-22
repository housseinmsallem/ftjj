import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('home')
  @ApiOperation({ summary: 'Page d\'accueil publique' })
  async home() {
    return this.publicService.getHome();
  }

  @Get('competitions')
  @ApiOperation({ summary: 'Liste des compétitions (publique)' })
  async competitions() {
    return this.publicService.getCompetitions();
  }

  @Get('rankings')
  @ApiOperation({ summary: 'Classements des athlètes' })
  async rankings() {
    return this.publicService.getRankings();
  }

  @Get('live')
  @ApiOperation({ summary: 'Matchs en direct (public)' })
  async live() {
    return this.publicService.getLive();
  }

  @Get('athletes')
  @ApiOperation({ summary: 'Recherche d\'athlètes' })
  @ApiQuery({ name: 'q', required: false })
  async athletes(@Query('q') search?: string) {
    return this.publicService.getAthletes(search);
  }

  @Get('clubs')
  @ApiOperation({ summary: 'Liste des clubs (publique)' })
  async clubs() {
    return this.publicService.getClubs();
  }

  @Get('coaches')
  @ApiOperation({ summary: 'Recherche de coachs' })
  @ApiQuery({ name: 'q', required: false })
  async coaches(@Query('q') search?: string) {
    return this.publicService.getCoaches(search);
  }

  @Get('referees')
  @ApiOperation({ summary: 'Recherche d\'arbitres' })
  @ApiQuery({ name: 'q', required: false })
  async referees(@Query('q') search?: string) {
    return this.publicService.getReferees(search);
  }

  @Get('competitions/:id')
  @ApiOperation({ summary: "Détail public d'une compétition" })
  async competitionDetail(@Param('id') id: string) {
    return this.publicService.getCompetitionDetail(id);
  }

  @Get('news')
  @ApiOperation({ summary: 'Actualités publiques' })
  async news() {
    return this.publicService.getNews();
  }
}
