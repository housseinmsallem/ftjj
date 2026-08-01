import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable } from "@nestjs/common";

@Injectable()
@WebSocketGateway({ cors: { origin: "*", credentials: true } })
export class ScoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client scoring connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client scoring déconnecté: ${client.id}`);
  }

  broadcastScoringUpdate(data: {
    sessionId: string;
    status: string;
    timerState?: string;
    remainingSeconds?: number;
    elapsedSeconds?: number;
    timerMode?: string;
    osaekomiSeconds?: number;
    osaekomiRunning?: boolean;
    standingCount?: number;
    standingCountRunning?: boolean;
    winnerSide?: string | null;
    winMethod?: string | null;
    redScore?: number;
    blueScore?: number;
    redAdvantages?: number;
    blueAdvantages?: number;
    redPenalties?: number;
    bluePenalties?: number;
    redWarnings?: number;
    blueWarnings?: number;
    ipponRed?: number;
    wazaariRed?: number;
    yukoRed?: number;
    ipponBlue?: number;
    wazaariBlue?: number;
    yukoBlue?: number;
    knockdownsRed?: number;
    knockdownsBlue?: number;
    stallingTop?: boolean;
    stallingBottom?: boolean;
    duoRound?: number;
    duoScores?: any[];
  }) {
    this.server.emit("public:scoring:update", data);
  }

  broadcastSessionCreated() {
    this.server.emit("scoring:sessionCreated", {});
  }

  broadcastSessionValidated() {
    this.server.emit("scoring:validated", {});
  }

  broadcastDashboardUpdate(data: any) {
    this.server.emit("dashboard:scoring:update", data);
  }
}
