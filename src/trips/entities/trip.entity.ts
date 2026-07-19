import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Driver } from '../../drivers/entities/driver.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

export enum TripStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'trips' })
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  origin: string;

  @Column({ length: 200 })
  destination: string;

  @Column({ type: 'varchar', length: 20, default: TripStatus.PLANNED })
  status: TripStatus;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  distanceKm: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.trips, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle | null;

  @Column({ type: 'int', nullable: true })
  vehicleId: number | null;

  @ManyToOne(() => Driver, (driver) => driver.trips, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'driverId' })
  driver: Driver | null;

  @Column({ type: 'int', nullable: true })
  driverId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
