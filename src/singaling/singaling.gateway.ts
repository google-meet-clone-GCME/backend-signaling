import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SingalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SingalingGateway.name);

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { roomId: string; userId: string }) {
    client.join(payload.roomId);
    this.logger.log(
      `Client ${payload.userId} ${client.id} joined room ${payload.roomId}`,
    );
    client.broadcast.to(payload.roomId).emit('user-joined', {
      socketId: client.id,
      userId: payload.userId,
    });
  }
}
