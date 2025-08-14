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
  private rooms: Record<string, { socketId: string; userName: string }[]> = {};

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove user from all rooms they were in
    Object.keys(this.rooms).forEach((roomId) => {
      this.rooms[roomId] = this.rooms[roomId].filter(
        (user) => user.socketId !== client.id,
      );

      // If room is empty, remove it
      if (this.rooms[roomId].length === 0) {
        delete this.rooms[roomId];
      }
    });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { roomId: string; userId: string }) {
    this.logger.log(
      `Client ${payload.userId} ${client.id} joined room ${payload.roomId}`,
    );

    if (!this.rooms[payload.roomId]) {
      this.rooms[payload.roomId] = [];
    }

    // Add the new user to the room first
    this.rooms[payload.roomId].push({
      socketId: client.id,
      userName: payload.userId,
    });

    client.join(payload.roomId);

    // Get the updated list of users (including the new user)
    const allUsers = this.rooms[payload.roomId];

    // Send the complete user list to all users in the room
    client.to(payload.roomId).emit('existing-users', allUsers);

    // Send the existing users (excluding the new user) to the new user
    const existingUsers = allUsers.filter(
      (user) => user.socketId !== client.id,
    );
    client.emit('existing-users', existingUsers);

    // Notify others about the new user
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

    // Remove user from the room
    if (this.rooms[payload.roomId]) {
      this.rooms[payload.roomId] = this.rooms[payload.roomId].filter(
        (user) => user.socketId !== client.id,
      );

      // If room is empty, remove it
      if (this.rooms[payload.roomId].length === 0) {
        delete this.rooms[payload.roomId];
      }
    }

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
      userName: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Received offer from ${payload.senderSocketId} to ${payload.targetSocketId} in ${payload.roomName}`,
    );
    console.log(payload.userName);
    if (!this.rooms[payload.roomName]) {
      this.rooms[payload.roomName] = [];
    }

    this.rooms[payload.roomName].push({
      socketId: client.id,
      userName: payload.userName,
    });

    client.to(payload.targetSocketId).emit('offer', {
      offer: payload.offer,
      senderSocketId: payload.senderSocketId,
      senderUserName: payload.userName,
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
      senderSocketId: payload.senderSocketId,
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
