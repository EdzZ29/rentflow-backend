import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BusinessStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
}

@Entity({ name: 'businesses' })
export class Business {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  name!: string;

  // What kind of rental business (e.g. "Vehicles", "Party & Events").
  @Column({ length: 80 })
  category!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: BusinessStatus.ACTIVE })
  status!: BusinessStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @Column({ type: 'int' })
  ownerId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
