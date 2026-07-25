import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SupportTicket } from './support-ticket.entity';

// One chat message inside a support ticket.
@Entity({ name: 'support_messages' })
export class SupportMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => SupportTicket, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: SupportTicket;

  @Column({ type: 'int' })
  ticketId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender!: User;

  @Column({ type: 'int' })
  senderId!: number;

  // True when written by an admin (support), false when by the ticket owner.
  @Column({ default: false })
  fromAdmin!: boolean;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
