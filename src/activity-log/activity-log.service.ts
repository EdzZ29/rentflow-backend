import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { ActivityLog } from './entities/activity-log.entity';

export interface RecordActivityInput {
  userId: number;
  category: string;
  action: string;
  title: string;
  description?: string | null;
  entityName?: string | null;
}

export interface ActivityFilter {
  category?: string;
  action?: string;
  q?: string;
  from?: string; // YYYY-MM-DD (inclusive)
  to?: string; // YYYY-MM-DD (inclusive)
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logs: Repository<ActivityLog>,
    private readonly realtime: RealtimeService,
  ) {}

  // Persist an activity entry and push it to the owner's live feed.
  async record(input: RecordActivityInput): Promise<ActivityLog> {
    const log = await this.logs.save(
      this.logs.create({
        userId: input.userId,
        category: input.category,
        action: input.action,
        title: input.title,
        description: input.description ?? null,
        entityName: input.entityName ?? null,
      }),
    );
    this.realtime.emitToUser(input.userId, { type: 'activity', log });
    return log;
  }

  // Best-effort: logging must never break the action that triggered it.
  async safeRecord(input: RecordActivityInput): Promise<void> {
    try {
      await this.record(input);
    } catch {
      /* ignore */
    }
  }

  async list(userId: number, filter: ActivityFilter): Promise<ActivityLog[]> {
    const qb = this.logs
      .createQueryBuilder('a')
      .where('a.userId = :userId', { userId });

    if (filter.category) {
      qb.andWhere('a.category = :category', { category: filter.category });
    }
    if (filter.action) {
      qb.andWhere('a.action = :action', { action: filter.action });
    }
    if (filter.q) {
      qb.andWhere(
        '(a.title ILIKE :q OR a.description ILIKE :q OR a.entityName ILIKE :q)',
        { q: `%${filter.q}%` },
      );
    }
    // Date range on createdAt (inclusive of the whole "to" day).
    const from = filter.from ? new Date(`${filter.from}T00:00:00.000Z`) : null;
    const to = filter.to ? new Date(`${filter.to}T23:59:59.999Z`) : null;
    if (from && to) {
      qb.andWhere({ createdAt: Between(from, to) });
    } else if (from) {
      qb.andWhere({ createdAt: MoreThanOrEqual(from) });
    } else if (to) {
      qb.andWhere({ createdAt: LessThanOrEqual(to) });
    }

    return qb.orderBy('a.createdAt', 'DESC').take(500).getMany();
  }
}
