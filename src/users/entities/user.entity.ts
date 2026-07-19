import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  CUSTOMER = 'customer',
}

export enum PlanType {
  NONE = 'none',
  TRIAL = 'trial',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  fullName!: string;

  @Column({ length: 180, unique: true })
  email!: string;

  // Never returned by default queries — must be explicitly selected for auth.
  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  // Subscription (relevant for owners).
  @Column({ type: 'varchar', length: 20, default: PlanType.NONE })
  plan!: PlanType;

  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  planStartedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
