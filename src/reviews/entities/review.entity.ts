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

// A customer's star rating (1–5) and optional written feedback for a product.
// One review per customer per product — posting again updates the existing one.
@Entity({ name: 'reviews' })
@Index('UQ_review_product_customer', ['productId', 'customerId'], {
  unique: true,
})
export class Review {
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

  // 1–5 whole stars.
  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  // The business owner's public reply to this review (optional).
  @Column({ type: 'text', nullable: true })
  ownerReply!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  repliedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
