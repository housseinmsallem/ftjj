import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScoringService } from './scoring.service';
import { ScoringGateway } from './scoring.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateSessionDto {
  @ApiProperty()
  @IsString()
  matchId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  discipline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mat?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  round?: string;
}

class ScoreActionDto {
  @ApiProperty({ enum: ['red', 'blue'] })
  @IsString()
  side: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  value?: number;
}

class FinishSessionDto {
  @ApiProperty()
  @IsString()
  winnerSide: string;

  @ApiProperty()
  @IsString()
  winMethod: string;
}

@ApiTags('Scoring (Sessions de combat)')
@Controller('scoring')
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly scoringGateway: ScoringGateway,
  ) {}

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des sessions de scoring' })
  async listSessions(@Query('status') status?: string) {
    return this.scoringService.listSessions({ status });
  }

  @Get('sessions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Détails d\'une session' })
  async getSession(@Param('id') id: string) {
    return this.scoringService.getSession(id);
  }

  @Get('sessions/:id/public')
  @ApiOperation({ summary: 'Session publique' })
  async getPublicSession(@Param('id') id: string) {
    return this.scoringService.getPublicSession(id);
  }

  @Get('fight/:fightId/public')
  @ApiOperation({ summary: 'Session publique par combat' })
  async getPublicSessionByFight(@Param('fightId') fightId: string) {
    return this.scoringService.getPublicSessionByFight(fightId);
  }

  @Get('public/sessions')
  @ApiOperation({ summary: 'Sessions publiques' })
  async listPublicSessions() {
    return this.scoringService.listPublicSessions();
  }

  @Get('rulesets/:discipline')
  @ApiOperation({ summary: 'Règles d\'une discipline' })
  async getRuleset(@Param('discipline') discipline: string) {
    return this.scoringService.getRuleset(discipline);
  }

  @Post('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Créer une session de scoring (admin)' })
  async createSession(@Body() dto: CreateSessionDto) {
    const result = await this.scoringService.createSession(dto);
    this.scoringGateway.broadcastSessionCreated();
    return result;
  }

  @Patch('sessions/:id/start')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Démarrer une session' })
  async startSession(@Param('id') id: string) {
    const result = await this.scoringService.startSession(id);
    const session = this.scoringService.getSessionState(id);
    if (session) {
      this.scoringGateway.broadcastScoringUpdate({
        sessionId: id,
        status: 'live',
        timerState: session.timer.status,
        remainingSeconds: session.timer.remainingSeconds,
        redScore: session.red.score,
        blueScore: session.blue.score,
      });
    }
    return result;
  }

  @Patch('sessions/:id/pause')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Mettre en pause une session' })
  async pauseSession(@Param('id') id: string) {
    const result = await this.scoringService.pauseSession(id);
    const session = this.scoringService.getSessionState(id);
    if (session) {
      this.scoringGateway.broadcastScoringUpdate({
        sessionId: id,
        status: 'paused',
        timerState: session.timer.status,
        remainingSeconds: session.timer.remainingSeconds,
      });
    }
    return result;
  }

  @Patch('sessions/:id/resume')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reprendre une session' })
  async resumeSession(@Param('id') id: string) {
    const result = await this.scoringService.resumeSession(id);
    const session = this.scoringService.getSessionState(id);
    if (session) {
      this.scoringGateway.broadcastScoringUpdate({
        sessionId: id,
        status: 'live',
        timerState: session.timer.status,
        remainingSeconds: session.timer.remainingSeconds,
      });
    }
    return result;
  }

  @Patch('sessions/:id/doctor-time')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Temps médecin' })
  async doctorTime(@Param('id') id: string) {
    const result = await this.scoringService.doctorTime(id);
    const session = this.scoringService.getSessionState(id);
    if (session) {
      this.scoringGateway.broadcastScoringUpdate({
        sessionId: id,
        status: 'paused',
        timerState: session.timer.status,
      });
    }
    return result;
  }

  @Patch('sessions/:id/waiting-time')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Temps d\'attente' })
  async waitingTime(@Param('id') id: string) {
    const result = await this.scoringService.waitingTime(id);
    return result;
  }

  @Patch('sessions/:id/action')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Envoyer une action de score' })
  async sendAction(@Param('id') id: string, @Body() dto: ScoreActionDto) {
    const result = await this.scoringService.sendAction(id, dto);
    const session = this.scoringService.getSessionState(id);
    if (session) {
      this.scoringGateway.broadcastScoringUpdate({
        sessionId: id,
        status: session.timer.status === 'running' ? 'live' : 'paused',
        timerState: session.timer.status,
        remainingSeconds: session.timer.remainingSeconds,
        redScore: session.red.score,
        blueScore: session.blue.score,
        redAdvantages: session.red.advantages,
        blueAdvantages: session.blue.advantages,
        redPenalties: session.red.penalties,
        bluePenalties: session.blue.penalties,
        redWarnings: session.red.warnings,
        blueWarnings: session.blue.warnings,
      });
      this.scoringGateway.broadcastDashboardUpdate({ sessionId: id });
    }
    return result;
  }

  @Patch('sessions/:id/finish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Terminer une session' })
  async finishSession(@Param('id') id: string, @Body() dto: FinishSessionDto) {
    const result = await this.scoringService.finishSession(id, dto);
    const session = this.scoringService.getSessionState(id);
    if (session) {
      this.scoringGateway.broadcastScoringUpdate({
        sessionId: id,
        status: 'finished',
        timerState: session.timer.status,
        winnerSide: session.winnerSide,
        winMethod: session.winMethod,
        redScore: session.red.score,
        blueScore: session.blue.score,
      });
    }
    return result;
  }

  @Patch('sessions/:id/validate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Valider une session' })
  async validateSession(@Param('id') id: string) {
    const result = await this.scoringService.validateSession(id);
    this.scoringGateway.broadcastSessionValidated();
    return result;
  }

  @Patch('sessions/:id/undo')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Annuler la dernière action' })
  async undoAction(@Param('id') id: string) {
    const result = await this.scoringService.undoAction(id);
    const session = this.scoringService.getSessionState(id);
    if (session) {
      this.scoringGateway.broadcastScoringUpdate({
        sessionId: id,
        status: session.timer.status === 'running' ? 'live' : 'paused',
        timerState: session.timer.status,
        remainingSeconds: session.timer.remainingSeconds,
        redScore: session.red.score,
        blueScore: session.blue.score,
        redAdvantages: session.red.advantages,
        blueAdvantages: session.blue.advantages,
        redPenalties: session.red.penalties,
        bluePenalties: session.blue.penalties,
      });
    }
    return result;
  }
}
