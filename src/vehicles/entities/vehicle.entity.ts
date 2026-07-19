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
import { Driver } from '../../drivers/entities/driver.entity';
import { Trip } from '../../trips/entities/trip.entity';

export enum VehicleStatus {
  ACTIVE = 'active',
  IN_MAINTENANCE = 'in_maintenance',
  RETIRED = 'retired',
}

@Entity({ name: 'vehicles' })
export class Vehicle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 80 })
  make!: string;

  @Column({ length: 80 })
  model!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ length: 20, unique: true })
  licensePlate!: string;

  @Column({ type: 'varchar', length: 40, unique: true, nullable: true })
  vin!: string | null;

  @Column({ type: 'varchar', length: 20, default: VehicleStatus.ACTIVE })
  status!: VehicleStatus;

  @Column({ type: 'int', default: 0 })
  odometerKm!: number;

  @ManyToOne(() => Driver, (driver) => driver.vehicles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'driverId' })
  driver!: Driver | null;

  @Column({ type: 'int', nullable: true })
  driverId!: number | null;

  @OneToMany(() => Trip, (trip) => trip.vehicle)
  trips!: Trip[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
