import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Trip } from '../../trips/entities/trip.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'drivers' })
export class Driver {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  @Column({ length: 180, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ length: 60, unique: true })
  licenseNumber!: string;

  @Column({ type: 'varchar', length: 20, default: DriverStatus.ACTIVE })
  status!: DriverStatus;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles!: Vehicle[];

  @OneToMany(() => Trip, (trip) => trip.driver)
  trips!: Trip[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
