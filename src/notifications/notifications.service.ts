import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { Notification } from './entities/notification.entity';

interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly realtime: RealtimeService,
  ) {}

  // Persist a notification and push it to the recipient in real time.
  async notify(input: NotifyInput): Promise<Notification> {
    const notification = await this.notifications.save(
      this.notifications.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      }),
    );
    this.realtime.emitToUser(input.userId, { type: 'notification', notification });
    return notification;
  }

  list(userId: number): Promise<Notification[]> {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: number, userId: number): Promise<void> {
    await this.notifications.update({ id, userId }, { read: true });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.notifications.update({ userId, read: false }, { read: true });
  }
}
