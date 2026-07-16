import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MatchStatus } from "@prisma/client";

export interface TimerState {
  status:
    "idle" | "running" | "paused" | "doctor_time" | "waiting_time" | "finished";
  remainingSeconds: number;
  totalSeconds: number;
}

export interface ScoreState {
  score: number;
  advantages: number;
  penalties: number;
  warnings: number;
}

@Injectable()
export class ScoringService {
  // In-memory session state for live matches (timer, extended score data)
  private sessions: Map<
    string,
    {
      matchId: string;
      timer: TimerState;
      red: ScoreState;
      blue: ScoreState;
      discipline: string;
      category: string;
      mat: string;
      round: string;
      winnerSide: string | null;
      winMethod: string | null;
      actions: any[];
    }
  > = new Map();

  constructor(private prisma: PrismaService) {}

  async createSession(data: {
    matchId: string;
    discipline?: string;
    category?: string;
    mat?: string;
    round?: string;
  }) {
    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      include: {
        redCorner: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
        blueCorner: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
        competition: { select: { id: true, name: true } },
      },
    });

    if (!match) {
      throw new NotFoundException("Match non trouvé");
    }

    const sessionId = data.matchId; // Use match ID as session ID

    this.sessions.set(sessionId, {
      matchId: data.matchId,
      timer: {
        status: "idle",
        remainingSeconds: 300, // Default 5 minutes
        totalSeconds: 300,
      },
      red: { score: 0, advantages: 0, penalties: 0, warnings: 0 },
      blue: { score: 0, advantages: 0, penalties: 0, warnings: 0 },
      discipline: data.discipline || "NEWAZA",
      category: data.category || "",
      mat: data.mat || `Tatami ${match.matNumber}`,
      round: data.round || "Tableau principal",
      winnerSide: null,
      winMethod: null,
      actions: [],
    });

    return {
      data: {
        _id: sessionId,
        ...this.sessions.get(sessionId),
        fight: {
          redAthlete: match.redCorner,
          blueAthlete: match.blueCorner,
        },
        competition: match.competition,
      },
    };
  }

  async getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException("Session non trouvée");
    }

    const match = await this.prisma.match.findUnique({
      where: { id: session.matchId },
      include: {
        redCorner: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
        blueCorner: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
        competition: { select: { id: true, name: true } },
      },
    });

    return {
      data: {
        _id: sessionId,
        ...session,
        fight: match
          ? {
              redAthlete: match.redCorner,
              blueAthlete: match.blueCorner,
            }
          : null,
        competition: match?.competition || null,
      },
    };
  }

  async getPublicSession(sessionId: string) {
    return this.getSession(sessionId);
  }

  async getPublicSessionByFight(fightId: string) {
    // Look up session by fight/match ID
    return this.getSession(fightId);
  }

  async listSessions(params?: { status?: string }) {
    const sessions: any[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (params?.status && session.timer.status !== params.status) continue;

      const match = await this.prisma.match.findUnique({
        where: { id: session.matchId },
        include: {
          redCorner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          blueCorner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          competition: { select: { id: true, name: true } },
        },
      });

      sessions.push({
        _id: id,
        ...session,
        fight: match
          ? {
              redAthlete: match.redCorner,
              blueAthlete: match.blueCorner,
            }
          : null,
        competition: match?.competition || null,
      });
    }

    return { data: sessions };
  }

  async listPublicSessions() {
    const sessions: any[] = [];

    for (const [id, session] of this.sessions.entries()) {
      const match = await this.prisma.match.findUnique({
        where: { id: session.matchId },
        include: {
          redCorner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          blueCorner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          competition: { select: { id: true, name: true } },
        },
      });

      sessions.push({
        _id: id,
        status:
          session.timer.status === "running"
            ? "live"
            : session.timer.status === "paused"
              ? "paused"
              : session.timer.status === "finished"
                ? "finished"
                : "waiting",
        timerState: session.timer.status,
        remainingSeconds: session.timer.remainingSeconds,
        red: session.red,
        blue: session.blue,
        discipline: session.discipline,
        category: session.category,
        mat: session.mat,
        round: session.round,
        winnerSide: session.winnerSide,
        winMethod: session.winMethod,
        fight: match
          ? {
              redAthlete: match.redCorner,
              blueAthlete: match.blueCorner,
            }
          : null,
      });
    }

    return { data: sessions };
  }

  async startSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    session.timer.status = "running";

    // Also update match status to LIVE
    await this.prisma.match.update({
      where: { id: session.matchId },
      data: { status: MatchStatus.LIVE },
    });

    return this.getSession(sessionId);
  }

  async pauseSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.status = "paused";
    return this.getSession(sessionId);
  }

  async resumeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.status = "running";
    return this.getSession(sessionId);
  }

  async doctorTime(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.status = "doctor_time";
    return this.getSession(sessionId);
  }

  async waitingTime(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.status = "waiting_time";
    return this.getSession(sessionId);
  }

  async sendAction(
    sessionId: string,
    action: { side: string; type: string; value?: number },
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    const side = action.side === "red" ? "red" : "blue";
    const target = session[side];

    switch (action.type) {
      case "point":
        target.score += action.value || 2;
        break;
      case "advantage":
        target.advantages += action.value || 1;
        break;
      case "penalty":
        target.penalties += action.value || 1;
        break;
      case "warning":
        target.warnings += action.value || 1;
        break;
      case "subtract_point":
        target.score = Math.max(0, target.score - (action.value || 1));
        break;
    }

    session.actions.push({
      side,
      type: action.type,
      value: action.value,
      timestamp: new Date(),
    });

    // Sync to match record
    await this.prisma.match.update({
      where: { id: session.matchId },
      data: {
        redScore: session.red.score,
        blueScore: session.blue.score,
        warningsRed: session.red.warnings,
        penaltiesRed: session.red.penalties,
        warningsBlue: session.blue.warnings,
        penaltiesBlue: session.blue.penalties,
      },
    });

    return this.getSession(sessionId);
  }

  async finishSession(
    sessionId: string,
    data: { winnerSide: string; winMethod: string },
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    session.timer.status = "finished";
    session.winnerSide = data.winnerSide;
    session.winMethod = data.winMethod;

    await this.prisma.match.update({
      where: { id: session.matchId },
      data: {
        status: MatchStatus.FINISHED,
        winnerSide: data.winnerSide,
        winMethod: data.winMethod,
      },
    });

    return this.getSession(sessionId);
  }

  async validateSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    // Validated is just a status marker
    return this.getSession(sessionId);
  }

  async undoAction(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    const lastAction = session.actions.pop();
    if (lastAction) {
      // Reverse the last action
      const target = session[lastAction.side as "red" | "blue"];
      switch (lastAction.type) {
        case "point":
          target.score = Math.max(0, target.score - (lastAction.value || 2));
          break;
        case "advantage":
          target.advantages = Math.max(
            0,
            target.advantages - (lastAction.value || 1),
          );
          break;
        case "penalty":
          target.penalties = Math.max(
            0,
            target.penalties - (lastAction.value || 1),
          );
          break;
        case "warning":
          target.warnings = Math.max(
            0,
            target.warnings - (lastAction.value || 1),
          );
          break;
        case "subtract_point":
          target.score += lastAction.value || 1;
          break;
      }
    }

    return this.getSession(sessionId);
  }

  getRuleset(discipline: string) {
    const rulesets: Record<string, any> = {
      NEWAZA: {
        name: "Newaza",
        points: {
          submission: 99,
          passGuard: 3,
          mount: 4,
          backTake: 4,
          sweep: 2,
          kneeOnBelly: 2,
        },
        advantages: true,
        penalties: true,
        warnings: true,
        maxWarnings: 3,
        timeMinutes: 5,
      },
      KUMITE: {
        name: "Kumite",
        points: { ippon: 3, wazaari: 2, yuko: 1 },
        advantages: false,
        penalties: true,
        warnings: true,
        maxWarnings: 4,
        timeMinutes: 3,
      },
    };

    return {
      data: rulesets[discipline?.toUpperCase()] || rulesets.NEWAZA,
    };
  }

  getSessionState(sessionId: string) {
    return this.sessions.get(sessionId) || null;
  }
}
