import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ScoringService } from "./scoring.service";
import { ScoringGateway } from "./scoring.gateway";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { IsString, IsOptional, IsInt } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// ── DTOs ──

class CreateSessionDto {
  @ApiProperty() @IsString() matchId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() discipline?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() mat?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() round?: string;
}

class ScoreActionDto {
  @ApiProperty({ enum: ["red", "blue"] }) @IsString() side: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() value?: number;
}

class FinishSessionDto {
  @ApiProperty() @IsString() winnerSide: string;
  @ApiProperty() @IsString() winMethod: string;
}

class FoulDto {
  @ApiProperty() @IsString() foulType: string;
}

class DuoScoreDto {
  @ApiProperty() @IsString() side: string;
  @ApiProperty() @IsInt() techniqueIndex: number;
  @ApiProperty() @IsInt() score: number;
}

// ── Helper to broadcast full session state ──

function broadcastSession(gateway: ScoringGateway, sessionId: string, svc: ScoringService) {
  const s = svc.getSessionState(sessionId);
  if (!s) return;
  gateway.broadcastScoringUpdate({
    sessionId,
    status: s.timer.status === "running" ? "live" : s.timer.status === "paused" ? "paused" : s.timer.status === "finished" ? "finished" : "waiting",
    timerState: s.timer.status,
    remainingSeconds: s.timer.remainingSeconds,
    elapsedSeconds: s.timer.elapsedSeconds,
    timerMode: s.timer.timerMode,
    osaekomiSeconds: s.timer.osaekomiSeconds,
    osaekomiRunning: s.timer.osaekomiRunning,
    standingCount: s.timer.standingCount,
    standingCountRunning: s.timer.standingCountRunning,
    redScore: s.red.score,
    blueScore: s.blue.score,
    redAdvantages: s.red.advantages,
    blueAdvantages: s.blue.advantages,
    redPenalties: s.red.penalties,
    bluePenalties: s.blue.penalties,
    redWarnings: s.red.warnings,
    blueWarnings: s.blue.warnings,
    ipponRed: s.red.ippon,
    wazaariRed: s.red.wazaari,
    yukoRed: s.red.yuko,
    ipponBlue: s.blue.ippon,
    wazaariBlue: s.blue.wazaari,
    yukoBlue: s.blue.yuko,
    knockdownsRed: s.red.knockdowns,
    knockdownsBlue: s.blue.knockdowns,
    winnerSide: s.winnerSide,
    winMethod: s.winMethod,
    duoRound: s.duoRound,
    duoScores: s.duoScores,
  });
}

@ApiTags("Scoring (Sessions de combat)")
@Controller("scoring")
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly scoringGateway: ScoringGateway,
  ) {}

  // ── Queries ──

  @Get("sessions")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  async listSessions(@Query("status") status?: string) {
    return this.scoringService.listSessions({ status });
  }

  @Get("sessions/:id")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  async getSession(@Param("id") id: string) {
    return this.scoringService.getSession(id);
  }

  @Get("sessions/:id/public")
  async getPublicSession(@Param("id") id: string) {
    return this.scoringService.getPublicSession(id);
  }

  @Get("fight/:fightId/public")
  async getPublicSessionByFight(@Param("fightId") fightId: string) {
    return this.scoringService.getPublicSessionByFight(fightId);
  }

  @Get("public/sessions")
  async listPublicSessions() {
    return this.scoringService.listPublicSessions();
  }

  @Get("rulesets/:discipline")
  async getRuleset(@Param("discipline") discipline: string) {
    return this.scoringService.getRuleset(discipline);
  }

  // ── Admin session management ──

  @Post("sessions")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async createSession(@Body() dto: CreateSessionDto) {
    const result = await this.scoringService.createSession(dto);
    this.scoringGateway.broadcastSessionCreated();
    return result;
  }

  @Patch("sessions/:id/start")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async startSession(@Param("id") id: string) {
    const result = await this.scoringService.startSession(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/pause")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async pauseSession(@Param("id") id: string) {
    const result = await this.scoringService.pauseSession(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/resume")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async resumeSession(@Param("id") id: string) {
    const result = await this.scoringService.resumeSession(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/doctor-time")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async doctorTime(@Param("id") id: string) {
    const result = await this.scoringService.doctorTime(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/waiting-time")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async waitingTime(@Param("id") id: string) {
    return this.scoringService.waitingTime(id);
  }

  @Patch("sessions/:id/action")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async sendAction(@Param("id") id: string, @Body() dto: ScoreActionDto) {
    const result = await this.scoringService.sendAction(id, dto);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/finish")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async finishSession(@Param("id") id: string, @Body() dto: FinishSessionDto) {
    const result = await this.scoringService.finishSession(id, dto);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/validate")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async validateSession(@Param("id") id: string) {
    const result = await this.scoringService.validateSession(id);
    this.scoringGateway.broadcastSessionValidated();
    return result;
  }

  @Patch("sessions/:id/undo")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async undoAction(@Param("id") id: string) {
    const result = await this.scoringService.undoAction(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  // ── Osaekomi (admin) ──

  @Patch("sessions/:id/osaekomi/start")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async osaekomiStart(@Param("id") id: string) {
    const result = await this.scoringService.osaekomiStart(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/osaekomi/stop")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async osaekomiStop(@Param("id") id: string) {
    const result = await this.scoringService.osaekomiStop(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  // ── Knockdown (admin) ──

  @Patch("sessions/:id/knockdown/:side")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async knockdown(@Param("id") id: string, @Param("side") side: string) {
    const result = await this.scoringService.knockdown(id, side);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/knockdown-count-done")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async knockdownCountDone(@Param("id") id: string) {
    const result = await this.scoringService.knockdownCountDone(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  // ── Foul (admin) ──

  @Patch("sessions/:id/foul/:side")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async foul(@Param("id") id: string, @Param("side") side: string, @Body() dto: FoulDto) {
    const result = await this.scoringService.foul(id, side, dto.foulType);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  // ── Duo System (admin) ──

  @Patch("sessions/:id/duo/round")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async duoSetRound(@Param("id") id: string, @Body() body: { round: number }) {
    const result = await this.scoringService.duoSetRound(id, body.round);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("sessions/:id/duo/score")
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  async duoScoreTechnique(@Param("id") id: string, @Body() dto: DuoScoreDto) {
    const result = await this.scoringService.duoScoreTechnique(id, dto.side, dto.techniqueIndex, dto.score);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  // ═══════════════════════════════════════════════
  //  PUBLIC / MODERATION endpoints (token-based)
  // ═══════════════════════════════════════════════

  @Post("public/sessions")
  async publicCreateSession(@Body() dto: CreateSessionDto) {
    const result = await this.scoringService.createSession(dto);
    this.scoringGateway.broadcastSessionCreated();
    return result;
  }

  @Patch("public/sessions/:id/start")
  async publicStartSession(@Param("id") id: string) {
    const result = await this.scoringService.startSession(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/pause")
  async publicPauseSession(@Param("id") id: string) {
    const result = await this.scoringService.pauseSession(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/action")
  async publicSendAction(@Param("id") id: string, @Body() dto: ScoreActionDto) {
    const result = await this.scoringService.sendAction(id, dto);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/finish")
  async publicFinishSession(@Param("id") id: string, @Body() dto: FinishSessionDto) {
    const result = await this.scoringService.finishSession(id, dto);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/sync-timer")
  async publicSyncTimer(
    @Param("id") id: string,
    @Body() body: { remainingSeconds: number; elapsedSeconds?: number; running: boolean; stallingTop?: boolean; stallingBottom?: boolean },
  ) {
    await this.scoringService.syncTimer(id, body);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return { message: "Timer sync OK" };
  }

  @Patch("public/sessions/:id/undo")
  async publicUndoAction(@Param("id") id: string) {
    const result = await this.scoringService.undoAction(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/reset")
  async publicResetSession(@Param("id") id: string) {
    await this.scoringService.resetSession(id);
    const session = this.scoringService.getSessionState(id);
    if (!session) throw new NotFoundException("Session non trouvée");
    this.scoringGateway.broadcastScoringUpdate({
      sessionId: id,
      status: "idle",
      timerState: "idle",
      remainingSeconds: 300,
      redScore: 0,
      blueScore: 0,
    });
    return { message: "Session réinitialisée", data: session };
  }

  @Patch("public/sessions/:id/osaekomi/start")
  async publicOsaekomiStart(@Param("id") id: string) {
    const result = await this.scoringService.osaekomiStart(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/osaekomi/stop")
  async publicOsaekomiStop(@Param("id") id: string) {
    const result = await this.scoringService.osaekomiStop(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/knockdown/:side")
  async publicKnockdown(@Param("id") id: string, @Param("side") side: string) {
    const result = await this.scoringService.knockdown(id, side);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/knockdown-count-done")
  async publicKnockdownCountDone(@Param("id") id: string) {
    const result = await this.scoringService.knockdownCountDone(id);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/foul/:side")
  async publicFoul(@Param("id") id: string, @Param("side") side: string, @Body() dto: FoulDto) {
    const result = await this.scoringService.foul(id, side, dto.foulType);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/duo/round")
  async publicDuoSetRound(@Param("id") id: string, @Body() body: { round: number }) {
    const result = await this.scoringService.duoSetRound(id, body.round);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }

  @Patch("public/sessions/:id/duo/score")
  async publicDuoScoreTechnique(@Param("id") id: string, @Body() dto: DuoScoreDto) {
    const result = await this.scoringService.duoScoreTechnique(id, dto.side, dto.techniqueIndex, dto.score);
    broadcastSession(this.scoringGateway, id, this.scoringService);
    return result;
  }
}
