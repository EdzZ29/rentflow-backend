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

export enum PackageAvailability {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
}

// How a package's price is charged.
export enum PackagePriceUnit {
  PACKAGE = 'package', // one flat price for the whole package
  DAY = 'day', // price is per rental day
}

// An owner-defined bundle of offerings. Unlike a Product, its contents are
// free-form lines the owner types in manually — "what they like".
@Entity({ name: 'packages' })
export class RentalPackage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 140 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'varchar', length: 3, default: 'PHP' })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: PackagePriceUnit.PACKAGE })
  priceUnit!: PackagePriceUnit;

  // The owner's manually-entered list of what's included in the package.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  items!: string[];

  // ── Optional pricing presentations (owner fills in what they want) ──
  // Itemised values — each inclusion with its standalone price. The sum is the
  // "if booked individually" total; the gap to `price` is the bundle saving.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  itemValues!: { label: string; value: number }[];

  // Named option tiers for quick comparison (e.g. Option A / Option B).
  @Column({ type: 'jsonb', default: () => "'[]'" })
  options!: { name: string; price: number; inclusions: string[] }[];

  // Tiered pricing ladder — every discount is paired with what the client
  // gives in exchange (e.g. "₱470,000 — 50% downpayment within 48hrs").
  @Column({ type: 'jsonb', default: () => "'[]'" })
  tiers!: { price: number; condition: string }[];

  @Column({
    type: 'varchar',
    length: 20,
    default: PackageAvailability.AVAILABLE,
  })
  availability!: PackageAvailability;

  // Whether the owner has published this package to the public marketplace.
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
