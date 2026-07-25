import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SupportMessage } from './entities/support-message.entity';
import {
  SupportCategory,
  SupportStatus,
  SupportTicket,
} from './entities/support-ticket.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly tickets: Repository<SupportTicket>,
    @InjectRepository(SupportMessage)
    private readonly messages: Repository<SupportMessage>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  // ── Create a ticket with its first message ────────────
  async create(dto: CreateTicketDto, actor: AuthUser) {
    const ticket = await this.tickets.save(
      this.tickets.create({
        userId: actor.id,
        subject: dto.subject.trim(),
        category: dto.category ?? SupportCategory.INQUIRY,
        status: SupportStatus.OPEN,
        lastMessageAt: new Date(),
      }),
    );
    await this.messages.save(
      this.messages.create({
        ticketId: ticket.id,
        senderId: actor.id,
        fromAdmin: false,
        body: dto.message.trim(),
      }),
    );

    // Alert every admin (real-time inbox refresh + a bell notification).
    this.realtime.emitToRole(UserRole.ADMIN, {
      type: 'support',
      action: 'created',
      ticketId: ticket.id,
    });
    await this.notifyAdmins({
      type: 'support.created',
      title: 'New support ticket',
      body: `${dto.subject.trim()}`,
      link: '/admin/support',
    });

    return this.getOne(ticket.id, actor);
  }

  // ── Listing ───────────────────────────────────────────
  // Admins see every ticket; users see only their own.
  async list(actor: AuthUser) {
    const qb = this.tickets
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u')
      .addSelect(['u.id', 'u.fullName', 'u.email', 'u.role'])
      .orderBy('COALESCE(t.lastMessageAt, t.createdAt)', 'DESC');

    if (actor.role !== UserRole.ADMIN) {
      qb.where('t.userId = :uid', { uid: actor.id });
    }
    const rows = await qb.getMany();
    return rows.map((t) => this.toListItem(t));
  }

  // ── One ticket with its full message thread ───────────
  async getOne(id: number, actor: AuthUser) {
    const ticket = await this.tickets.findOne({
      where: { id },
      relations: { user: true, messages: { sender: true } },
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (actor.role !== UserRole.ADMIN && ticket.userId !== actor.id) {
      throw new ForbiddenException('This ticket is not yours.');
    }
    return {
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      createdAt: ticket.createdAt,
      user: ticket.user
        ? {
            id: ticket.user.id,
            name: ticket.user.fullName,
            email: ticket.user.email,
            role: ticket.user.role,
          }
        : null,
      messages: (ticket.messages ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        fromAdmin: m.fromAdmin,
        senderName: m.sender?.fullName ?? 'User',
        createdAt: m.createdAt,
      })),
    };
  }

  // ── Post a message into a ticket ──────────────────────
  async addMessage(id: number, dto: CreateMessageDto, actor: AuthUser) {
    const ticket = await this.tickets.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const isAdmin = actor.role === UserRole.ADMIN;
    if (!isAdmin && ticket.userId !== actor.id) {
      throw new ForbiddenException('This ticket is not yours.');
    }

    await this.messages.save(
      this.messages.create({
        ticketId: ticket.id,
        senderId: actor.id,
        fromAdmin: isAdmin,
        body: dto.body.trim(),
      }),
    );

    // An admin reply moves an open ticket to "pending"; a user reply reopens it.
    ticket.lastMessageAt = new Date();
    if (isAdmin && ticket.status === SupportStatus.OPEN) {
      ticket.status = SupportStatus.PENDING;
    } else if (!isAdmin && ticket.status === SupportStatus.RESOLVED) {
      ticket.status = SupportStatus.OPEN;
    }
    await this.tickets.save(ticket);

    const event = {
      type: 'support' as const,
      action: 'message' as const,
      ticketId: ticket.id,
    };
    if (isAdmin) {
      // Notify the ticket owner.
      this.realtime.emitToUser(ticket.userId, event);
      await this.safeNotify({
        userId: ticket.userId,
        type: 'support.reply',
        title: 'Support replied',
        body: ticket.subject,
        link: this.linkForRole(ticket.user?.role),
      });
    } else {
      // Notify admins.
      this.realtime.emitToRole(UserRole.ADMIN, event);
      await this.notifyAdmins({
        type: 'support.reply',
        title: 'New reply on a ticket',
        body: ticket.subject,
        link: '/admin/support',
      });
    }

    return this.getOne(ticket.id, actor);
  }

  // ── Change status (admin, or the owner may close their own) ──
  async updateStatus(id: number, status: SupportStatus, actor: AuthUser) {
    const ticket = await this.tickets.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const isAdmin = actor.role === UserRole.ADMIN;
    const isOwner = ticket.userId === actor.id;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('This ticket is not yours.');
    }
    // A non-admin owner may only close their own ticket.
    if (!isAdmin && status !== SupportStatus.CLOSED) {
      throw new ForbiddenException('You can only close your ticket.');
    }

    ticket.status = status;
    await this.tickets.save(ticket);

    const event = {
      type: 'support' as const,
      action: 'updated' as const,
      ticketId: ticket.id,
    };
    this.realtime.emitToRole(UserRole.ADMIN, event);
    this.realtime.emitToUser(ticket.userId, event);
    if (isAdmin) {
      await this.safeNotify({
        userId: ticket.userId,
        type: 'support.status',
        title: `Ticket ${status}`,
        body: ticket.subject,
        link: this.linkForRole(ticket.user?.role),
      });
    }
    return this.getOne(ticket.id, actor);
  }

  // ── Helpers ───────────────────────────────────────────
  private toListItem(t: SupportTicket) {
    return {
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      lastMessageAt: t.lastMessageAt ?? t.createdAt,
      createdAt: t.createdAt,
      user: t.user
        ? { id: t.user.id, name: t.user.fullName, email: t.user.email, role: t.user.role }
        : null,
    };
  }

  private async notifyAdmins(payload: {
    type: string;
    title: string;
    body: string;
    link?: string;
  }): Promise<void> {
    const admins = await this.users.find({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) => this.safeNotify({ userId: a.id, ...payload })),
    );
  }

  private linkForRole(role?: UserRole): string {
    return role === UserRole.OWNER ? '/owner/support' : '/customer/support';
  }

  private async safeNotify(input: {
    userId: number;
    type: string;
    title: string;
    body: string;
    link?: string;
  }): Promise<void> {
    try {
      await this.notifications.notify(input);
    } catch {
      /* best-effort */
    }
  }
}
