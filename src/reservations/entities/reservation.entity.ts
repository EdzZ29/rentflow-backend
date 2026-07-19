import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// A customer either books (rent now) or reserves (hold for later).
export enum BookingType {
  BOOK = 'book',
  RESERVE = 'reserve',
}

@Entity({ name: 'reservations' })
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'int' })
  productId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: User;

  @Column({ type: 'int' })
  customerId!: number;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ type: 'varchar', length: 20, default: ReservationStatus.PENDING })
  status!: ReservationStatus;

  // "book" (rent now) or "reserve" (hold for later).
  @Column({ type: 'varchar', length: 20, default: BookingType.BOOK })
  type!: BookingType;

  // Validity / contact info the customer provides when booking.
  @Column({ type: 'varchar', length: 40, nullable: true })
  contactPhone!: string | null;

  // Chosen payment method (mock — no card data is stored).
  @Column({ type: 'varchar', length: 20, nullable: true })
  paymentMethod!: string | null;

  // Consent to the rental terms — required to book.
  @Column({ default: false })
  agreedToTerms!: boolean;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
