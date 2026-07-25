import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { User } from '../users/entities/user.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, SupportMessage, User]),
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
