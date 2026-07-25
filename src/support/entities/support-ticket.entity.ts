import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportMessage } from './support-message.entity';

export enum SupportStatus {
  OPEN = 'open',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SupportCategory {
  INQUIRY = 'inquiry',
  REPORT = 'report',
  REQUEST = 'request',
  BILLING = 'billing',
  OTHER = 'other',
}

// A support conversation opened by a customer or owner; admins reply.
@Entity({ name: 'support_tickets' })
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ length: 160 })
  subject!: string;

  @Column({ type: 'varchar', length: 20, default: SupportCategory.INQUIRY })
  category!: SupportCategory;

  @Column({ type: 'varchar', length: 20, default: SupportStatus.OPEN })
  status!: SupportStatus;

  // Bumped whenever a message is added, so the inbox sorts by recent activity.
  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @OneToMany(() => SupportMessage, (m) => m.ticket)
  messages!: SupportMessage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
