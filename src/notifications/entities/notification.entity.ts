import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  // Recipient of the notification.
  @Index()
  @Column({ type: 'int' })
  userId!: number;

  // Machine type, e.g. "booking.created", "booking.confirmed".
  @Column({ type: 'varchar', length: 40 })
  type!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'varchar', length: 300 })
  body!: string;

  // Optional in-app link the bell item navigates to.
  @Column({ type: 'varchar', length: 200, nullable: true })
  link!: string | null;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
