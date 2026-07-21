import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// A social identity linked to a RentFlow user. One user can have several
// (e.g. both Google and Facebook), so login by any linked provider resolves to
// the same account.
@Entity({ name: 'oauth_accounts' })
@Unique(['provider', 'providerUserId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // 'google' | 'facebook'
  @Column({ type: 'varchar', length: 20 })
  provider!: string;

  // The provider's own stable user id (Google `sub`, Facebook app-scoped id).
  @Column({ type: 'varchar', length: 191 })
  providerUserId!: string;

  // Email as reported by the provider at link time (for reference/audit).
  @Column({ type: 'varchar', length: 180, nullable: true })
  email!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
