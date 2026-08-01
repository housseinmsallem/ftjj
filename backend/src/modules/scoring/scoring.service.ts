import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MatchStatus } from "@prisma/client";

export interface TimerState {
  status:
    | "idle" | "running" | "paused" | "doctor_time" | "waiting_time" | "finished";
  remainingSeconds: number;
  totalSeconds: number;
  elapsedSeconds: number;
  timerMode: "countdown" | "countup";
  osaekomiSeconds: number;
  osaekomiRunning: boolean;
  standingCount: number;
  standingCountRunning: boolean;
}

export interface ScoreState {
  score: number;
  advantages: number;
  penalties: number;
  warnings: number;
  // Fighting
  ippon: number;
  wazaari: number;
  yuko: number;
  // Full Contact
  knockdowns: number;
  fouls: string[];
}

export interface DuoRoundScore {
  round: number;
  techniqueScores: number[];   // 10 scores per round (5 attacks + 5 counters)
  total: number;
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
      // Duo System
      duoRound: number;
      duoScores: DuoRoundScore[];
    }
  > = new Map();

  constructor(private prisma: PrismaService) {}

  /** Get the ruleset config for a discipline (used by createSession to set timer, etc.) */
  getRuleset(discipline: string) {
    const rulesets: Record<string, any> = {
      NEWAZA: {
        name: "Newaza",
        points: { submission: 99, passGuard: 3, mount: 4, backTake: 4, sweep: 2, kneeOnBelly: 2 },
        advantages: true,
        penalties: true,
        warnings: true,
        maxWarnings: 3,
        timeMinutes: 5,
        timerMode: "countdown",
        osaekomiEnabled: false,
        roundSystem: "single",
        buttons: [
          { type: "point", label: "Pass. garde", value: 3, key: "passGuard" },
          { type: "point", label: "Montée", value: 4, key: "mount" },
          { type: "point", label: "Prise de dos", value: 4, key: "backTake" },
          { type: "point", label: "Balayage", value: 2, key: "sweep" },
          { type: "point", label: "Genou/ventre", value: 2, key: "kneeOnBelly" },
          { type: "point", label: "Soumission", value: 99, key: "submission" },
          { type: "advantage", label: "Avantage", value: 1, key: "advantage" },
          { type: "penalty", label: "Pénalité", value: 1, key: "penalty" },
        ],
      },
      FIGHTING: {
        name: "Fighting",
        points: { ippon: 3, wazaari: 2, yuko: 1 },
        advantages: false,
        penalties: true,
        warnings: true,
        maxWarnings: 4,
        timeMinutes: 3,
        timerMode: "countdown",
        osaekomiEnabled: false,
        roundSystem: "single",
        buttons: [
          { type: "point", label: "Ippon", value: 3, key: "ippon" },
          { type: "point", label: "Waza-ari", value: 2, key: "wazaari" },
          { type: "point", label: "Yuko", value: 1, key: "yuko" },
          { type: "warning", label: "Chui", value: 1, key: "warning" },
          { type: "penalty", label: "Hansoku-chui", value: 1, key: "penalty" },
        ],
      },
      DUO: {
        name: "Duo System",
        points: {},
        advantages: false,
        penalties: false,
        warnings: false,
        maxWarnings: 0,
        timeMinutes: 3,
        timerMode: "countup",
        osaekomiEnabled: false,
        roundSystem: "best_of_3",
        techniquesPerRound: 10,
        scoreRange: { min: 5, max: 10 },
        buttons: [],
      },
      FULL_CONTACT: {
        name: "Full Contact",
        points: {},
        advantages: false,
        penalties: true,
        warnings: true,
        maxWarnings: 3,
        timeMinutes: 3,
        timerMode: "countdown",
        osaekomiEnabled: false,
        roundSystem: "single",
        standingCount: 8,
        fouls: ["headbutt", "groin", "bite", "eye", "back_of_head", "elbow_12_6", "holding"],
        buttons: [
          { type: "penalty", label: "Avertissement", value: 1, key: "warning" },
          { type: "penalty", label: "-1 pt", value: 1, key: "penalty" },
        ],
      },
    };

    return {
      data: rulesets[discipline?.toUpperCase()] || rulesets.NEWAZA,
    };
  }

  private emptyScore(): ScoreState {
    return { score: 0, advantages: 0, penalties: 0, warnings: 0, ippon: 0, wazaari: 0, yuko: 0, knockdowns: 0, fouls: [] };
  }

  private emptyTimer(ruleset: any): TimerState {
    const total = (ruleset.timeMinutes || 5) * 60;
    return {
      status: "idle",
      remainingSeconds: total,
      totalSeconds: total,
      elapsedSeconds: 0,
      timerMode: ruleset.timerMode || "countdown",
      osaekomiSeconds: 0,
      osaekomiRunning: false,
      standingCount: 0,
      standingCountRunning: false,
    };
  }

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
        redCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        competition: { select: { id: true, name: true } },
        mat: { select: { number: true } },
      },
    });

    if (!match) throw new NotFoundException("Match non trouvé");

    const sessionId = data.matchId;
    const discipline = data.discipline || "NEWAZA";
    const ruleset = this.getRuleset(discipline).data;

    const existing = this.sessions.get(sessionId);
    if (existing) {
      return {
        data: {
          _id: sessionId,
          ...existing,
          discipline,
          fight: { redAthlete: match.redCorner, blueAthlete: match.blueCorner },
          competition: match.competition,
          ruleset,
        },
      };
    }

    this.sessions.set(sessionId, {
      matchId: data.matchId,
      timer: this.emptyTimer(ruleset),
      red: this.emptyScore(),
      blue: this.emptyScore(),
      discipline,
      category: data.category || "",
      mat: data.mat || `Tatami ${match.mat?.number ?? 1}`,
      round: data.round || "Tableau principal",
      winnerSide: null,
      winMethod: null,
      actions: [],
      duoRound: 1,
      duoScores: [],
    });

    return {
      data: {
        _id: sessionId,
        ...this.sessions.get(sessionId),
        fight: { redAthlete: match.redCorner, blueAthlete: match.blueCorner },
        competition: match.competition,
        ruleset,
      },
    };
  }

  async getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    const match = await this.prisma.match.findUnique({
      where: { id: session.matchId },
      include: {
        redCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        blueCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        competition: { select: { id: true, name: true } },
      },
    });

    return {
      data: {
        _id: sessionId,
        ...session,
        fight: match ? { redAthlete: match.redCorner, blueAthlete: match.blueCorner } : null,
        competition: match?.competition || null,
        ruleset: this.getRuleset(session.discipline).data,
      },
    };
  }

  async getPublicSession(sessionId: string) { return this.getSession(sessionId); }
  async getPublicSessionByFight(fightId: string) { return this.getSession(fightId); }

  async listSessions(params?: { status?: string }) {
    const sessions: any[] = [];
    for (const [id, session] of this.sessions.entries()) {
      if (params?.status && session.timer.status !== params.status) continue;
      const match = await this.prisma.match.findUnique({
        where: { id: session.matchId },
        include: {
          redCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          blueCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          competition: { select: { id: true, name: true } },
        },
      });
      sessions.push({
        _id: id, ...session,
        fight: match ? { redAthlete: match.redCorner, blueAthlete: match.blueCorner } : null,
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
          redCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          blueCorner: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          competition: { select: { id: true, name: true } },
        },
      });
      sessions.push({
        _id: id,
        status: session.timer.status === "running" ? "live" : session.timer.status === "paused" ? "paused" : session.timer.status === "finished" ? "finished" : "waiting",
        timerState: session.timer.status,
        remainingSeconds: session.timer.remainingSeconds,
        elapsedSeconds: session.timer.elapsedSeconds,
        timerMode: session.timer.timerMode,
        osaekomiSeconds: session.timer.osaekomiSeconds,
        osaekomiRunning: session.timer.osaekomiRunning,
        standingCount: session.timer.standingCount,
        standingCountRunning: session.timer.standingCountRunning,
        red: session.red,
        blue: session.blue,
        discipline: session.discipline,
        category: session.category,
        mat: session.mat,
        round: session.round,
        winnerSide: session.winnerSide,
        winMethod: session.winMethod,
        duoRound: session.duoRound,
        duoScores: session.duoScores,
        fight: match ? { redAthlete: match.redCorner, blueAthlete: match.blueCorner } : null,
      });
    }
    return { data: sessions };
  }

  // ── Timer controls ──

  async startSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.status = "running";
    await this.prisma.match.update({ where: { id: session.matchId }, data: { status: MatchStatus.LIVE } });
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

  async syncTimer(sessionId: string, data: { remainingSeconds?: number; elapsedSeconds?: number; running: boolean; stallingTop?: boolean; stallingBottom?: boolean }) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    if (data.remainingSeconds !== undefined) session.timer.remainingSeconds = Math.max(0, data.remainingSeconds);
    if (data.elapsedSeconds !== undefined) session.timer.elapsedSeconds = Math.max(0, data.elapsedSeconds);
    session.timer.status = data.running ? "running" : "paused";
    return this.getSession(sessionId);
  }

  // ── Osaekomi (hold-down timer) ──

  async osaekomiStart(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.osaekomiSeconds = 0;
    session.timer.osaekomiRunning = true;
    return this.getSession(sessionId);
  }

  async osaekomiStop(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.osaekomiRunning = false;
    return this.getSession(sessionId);
  }

  // ── Knockdown (Full Contact) ──

  async knockdown(sessionId: string, side: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    const target = session[side as "red" | "blue"];
    target.knockdowns = (target.knockdowns || 0) + 1;
    session.timer.standingCount = 8;
    session.timer.standingCountRunning = true;
    session.actions.push({ side, type: "knockdown", value: 1, timestamp: new Date() });
    return this.getSession(sessionId);
  }

  async knockdownCountDone(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.timer.standingCountRunning = false;
    session.timer.standingCount = 0;
    return this.getSession(sessionId);
  }

  // ── Foul (Full Contact) ──

  async foul(sessionId: string, side: string, foulType: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    const target = session[side as "red" | "blue"];
    target.fouls = [...(target.fouls || []), foulType];
    target.warnings = (target.warnings || 0) + 1;
    session.actions.push({ side, type: "foul", value: foulType, timestamp: new Date() });
    return this.getSession(sessionId);
  }

  // ── Duo System scoring ──

  async duoSetRound(sessionId: string, round: number) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    session.duoRound = Math.max(1, Math.min(3, round));
    return this.getSession(sessionId);
  }

  async duoScoreTechnique(sessionId: string, side: string, techniqueIndex: number, score: number) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    let roundScores = session.duoScores.find(r => r.round === session.duoRound);
    if (!roundScores) {
      roundScores = { round: session.duoRound, techniqueScores: new Array(10).fill(0), total: 0 };
      session.duoScores.push(roundScores);
    }
    const idx = Math.max(0, Math.min(9, techniqueIndex));
    roundScores.techniqueScores[idx] = score;
    roundScores.total = roundScores.techniqueScores.reduce((a, b) => a + b, 0);

    // Add to regular score for the side
    const target = session[side as "red" | "blue"];
    target.score = roundScores.total;

    session.actions.push({ side, type: "duo_score", value: score, techniqueIndex: idx, timestamp: new Date() });
    return this.getSession(sessionId);
  }

  // ── Scoring actions (discipline-aware) ──

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
        target.score = Math.max(0, target.score + (action.value || 2));
        break;
      case "ippon":
        target.ippon = (target.ippon || 0) + 1;
        target.score += (action.value || 3);
        break;
      case "wazaari":
        target.wazaari = (target.wazaari || 0) + 1;
        target.score += (action.value || 2);
        break;
      case "yuko":
        target.yuko = (target.yuko || 0) + 1;
        target.score += (action.value || 1);
        break;
      case "advantage":
        target.advantages += action.value || 1;
        break;
      case "penalty":
        target.penalties = Math.max(0, target.penalties + (action.value || 1));
        break;
      case "warning":
        target.warnings = Math.max(0, target.warnings + (action.value || 1));
        break;
      case "subtract_point":
        target.score = Math.max(0, target.score - (action.value || 1));
        break;
    }

    session.actions.push({ side, type: action.type, value: action.value, timestamp: new Date() });

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

  async finishSession(sessionId: string, data: { winnerSide: string; winMethod: string }) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    session.timer.status = "finished";
    session.winnerSide = data.winnerSide;
    session.winMethod = data.winMethod;

    await this.prisma.match.update({
      where: { id: session.matchId },
      data: { status: MatchStatus.FINISHED, winnerSide: data.winnerSide, winMethod: data.winMethod },
    });

    return this.getSession(sessionId);
  }

  async validateSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");
    return this.getSession(sessionId);
  }

  async undoAction(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    const lastAction = session.actions.pop();
    if (lastAction) {
      const target = session[lastAction.side as "red" | "blue"];
      switch (lastAction.type) {
        case "point":
          target.score = Math.max(0, target.score - (lastAction.value || 2));
          break;
        case "ippon":
          target.ippon = Math.max(0, (target.ippon || 0) - 1);
          target.score = Math.max(0, target.score - (lastAction.value || 3));
          break;
        case "wazaari":
          target.wazaari = Math.max(0, (target.wazaari || 0) - 1);
          target.score = Math.max(0, target.score - (lastAction.value || 2));
          break;
        case "yuko":
          target.yuko = Math.max(0, (target.yuko || 0) - 1);
          target.score = Math.max(0, target.score - (lastAction.value || 1));
          break;
        case "advantage":
          target.advantages = Math.max(0, target.advantages - (lastAction.value || 1));
          break;
        case "penalty":
          target.penalties = Math.max(0, target.penalties - (lastAction.value || 1));
          break;
        case "warning":
          target.warnings = Math.max(0, target.warnings - (lastAction.value || 1));
          break;
        case "subtract_point":
          target.score += lastAction.value || 1;
          break;
        case "knockdown":
          target.knockdowns = Math.max(0, (target.knockdowns || 0) - 1);
          break;
        case "foul":
          target.fouls = (target.fouls || []).slice(0, -1);
          target.warnings = Math.max(0, target.warnings - 1);
          break;
      }
    }

    return this.getSession(sessionId);
  }

  async resetSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException("Session non trouvée");

    const ruleset = this.getRuleset(session.discipline).data;
    session.timer = this.emptyTimer(ruleset);
    session.red = this.emptyScore();
    session.blue = this.emptyScore();
    session.winnerSide = null;
    session.winMethod = null;
    session.actions = [];
    session.duoRound = 1;
    session.duoScores = [];

    await this.prisma.match.update({
      where: { id: session.matchId },
      data: {
        status: "UPCOMING",
        redScore: 0, blueScore: 0,
        warningsRed: 0, penaltiesRed: 0,
        warningsBlue: 0, penaltiesBlue: 0,
        winnerSide: null, winMethod: null,
      },
    });

    return { message: "Session réinitialisée" };
  }

  getSessionState(sessionId: string) {
    return this.sessions.get(sessionId) || null;
  }
}
