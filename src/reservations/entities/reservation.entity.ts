import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
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
  // The unit has been handed over to the renter and is out.
  RELEASED = 'released',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// How a release / return was recorded — by scanning the booking QR, or by the
// owner pressing the button in their dashboard.
export enum HandoverMethod {
  QR = 'qr',
  MANUAL = 'manual',
}

// A customer either books (rent now) or reserves (hold for later).
export enum BookingType {
  BOOK = 'book',
  RESERVE = 'reserve',
}

// Who drives — only meaningful for vehicle rentals.
export enum DriverOption {
  SELF_DRIVE = 'self_drive',
  WITH_DRIVER = 'with_driver',
}

// How the renter takes delivery — their choice, one or the other.
export enum HandoverMode {
  PICKUP = 'pickup', // the renter collects it themselves
  DROPOFF = 'dropoff', // the owner drops it off at the renter's location
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

  // ── Booking details collected by the step-by-step booking flow ──
  // What the renter needs the item for.
  @Column({ type: 'text', nullable: true })
  purpose!: string | null;

  // The renter picks ONE handover method: collect it themselves, or have the
  // owner drop it off. Only the matching location column is filled in.
  @Column({ type: 'varchar', length: 10, nullable: true })
  handoverMode!: HandoverMode | null;

  // Where the renter collects the item / where it should be dropped off, plus
  // the agreed times. Times are stored as 'HH:MM' strings.
  @Column({ type: 'varchar', length: 200, nullable: true })
  pickupLocation!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  dropoffLocation!: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  pickupTime!: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  dropoffTime!: string | null;

  // Which ID the renter chose to present (e.g. "Passport", "UMID").
  @Column({ type: 'varchar', length: 60, nullable: true })
  validIdType!: string | null;

  // Valid ID applies to every category, so it stays here. Category-specific
  // documents (e.g. a driver's licence) live in that category's detail table.
  @Column({ type: 'varchar', length: 255, nullable: true })
  validIdUrl!: string | null;

  // ── Handover QR codes ───────────────────────────────────
  // Two separate single-purpose codes, both 192 bits of randomness. Because the
  // action is bound to which token was scanned, a release code can never
  // trigger a return and vice versa.
  //
  // The release code is issued when the booking is made. The return code is
  // only issued at the moment of release, so it cannot be captured or scanned
  // before the unit is actually out.
  @Index('UQ_reservation_release_token', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  releaseToken!: string | null;

  @Index('UQ_reservation_return_token', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  returnToken!: string | null;

  // Set once, when the unit is handed over. Also what makes a second scan of
  // the same code a no-op instead of a repeat release.
  @Column({ type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  releaseMethod!: HandoverMethod | null;

  // Set once, when the unit comes back.
  @Column({ type: 'timestamptz', nullable: true })
  returnedAt!: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  returnMethod!: HandoverMethod | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
