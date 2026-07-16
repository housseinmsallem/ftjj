import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/live',
})
export class MatchesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connecté au live scoring: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client déconnecté du live scoring: ${client.id}`);
  }

  // Admin updates a match score - broadcast to all spectators
  broadcastMatchUpdate(matchId: string, matchData: any) {
    this.server.emit('match:update', {
      matchId,
      ...matchData,
    });
  }

  // Broadcast match status change
  broadcastMatchStatus(matchId: string, status: string) {
    this.server.emit('match:status', {
      matchId,
      status,
    });
  }

  // Broadcast new match created
  broadcastNewMatch(matchData: any) {
    this.server.emit('match:new', matchData);
  }

  @SubscribeMessage('subscribe:match')
  handleSubscribeMatch(client: Socket, matchId: string) {
    client.join(`match:${matchId}`);
    return { message: `Abonné au match ${matchId}` };
  }

  @SubscribeMessage('unsubscribe:match')
  handleUnsubscribeMatch(client: Socket, matchId: string) {
    client.leave(`match:${matchId}`);
    return { message: `Désabonné du match ${matchId}` };
  }
}
