import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '../../businesses/entities/business.entity';

export enum ProductAvailability {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
}

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 140 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // House rules the renter must follow (e.g. valid ID, fuel policy, no smoking).
  @Column({ type: 'text', nullable: true })
  rentalRules!: string | null;

  // What happens if the renter cancels — refund windows, fees, etc.
  @Column({ type: 'text', nullable: true })
  cancellationPolicy!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  pricePerDay!: number;

  @Column({ type: 'varchar', length: 3, default: 'PHP' })
  currency!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: ProductAvailability.AVAILABLE })
  availability!: ProductAvailability;

  // Whether the owner has published this product to the public marketplace.
  // Only shown to customers when its business is on the MARKETPLACE plan.
  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business!: Business;

  @Column({ type: 'int' })
  businessId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
