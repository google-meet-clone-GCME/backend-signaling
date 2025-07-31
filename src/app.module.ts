import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SingalingGateway } from './singaling/singaling.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, SingalingGateway],
})
export class AppModule {}
