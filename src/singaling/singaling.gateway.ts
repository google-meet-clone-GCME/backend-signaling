import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
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

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, payload: { roomId: string; userId: string }) {
    client.leave(payload.roomId);
    this.logger.log(
      `Client ${payload.userId} ${client.id} left room ${payload.roomId}`,
    );

    client.broadcast.to(payload.roomId).emit('user-left', {
      socketId: client.id,
      userId: payload.userId,
    });
  }

  @SubscribeMessage('offer')
  handleOffer(
    @MessageBody()
    payload: {
      targetSocketId: string;
      offer: RTCSessionDescriptionInit;
      senderSocketId: string;
      roomName: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Received offer from ${payload.senderSocketId} to ${payload.targetSocketId} in ${payload.roomName}`,
    );

    client.to(payload.targetSocketId).emit('offer', {
      offer: payload.offer,
      senderSocketId: payload.senderSocketId,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @MessageBody()
    payload: {
      senderSocketId: string;
      answer: RTCSessionDescriptionInit;
      targetSocketId: string;
      roomName: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Received answer from ${payload.senderSocketId} ${client.id} for ${payload.targetSocketId} in room ${payload.roomName}`,
    );

    client.to(payload.targetSocketId).emit('answer', {
      answer: payload.answer,
      senderSocketId: client.id,
      roomName: payload.roomName,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody()
    payload: {
      targetSocketId: string;
      senderSocketId: string;
      candidate: RTCIceCandidateInit;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `ice-candidate sent from ${payload.senderSocketId} to ${payload.targetSocketId}`,
    );

    client.to(payload.targetSocketId).emit('ice-candidate', {
      candidate: payload.candidate,
      senderSocketId: payload.senderSocketId,
    });
  }
}
