import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// A record of something the owner did (or that happened to their businesses):
// creating/editing/deleting businesses & products, booking status changes, and
// plan changes. Read-only history — never mutated after creation.
@Entity({ name: 'activity_logs' })
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id!: number;

  // The owner this activity belongs to.
  @Index()
  @Column({ type: 'int' })
  userId!: number;

  // High-level group used for filtering: business | product | booking | plan.
  @Column({ type: 'varchar', length: 20 })
  category!: string;

  // What happened: created | updated | deleted | approved | cancelled |
  // completed | booked | trial_started | changed.
  @Column({ type: 'varchar', length: 30 })
  action!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description!: string | null;

  // Name of the affected thing (business/product/customer) — powers name search.
  @Column({ type: 'varchar', length: 160, nullable: true })
  entityName!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
