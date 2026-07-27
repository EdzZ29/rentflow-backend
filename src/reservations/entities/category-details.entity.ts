// Per-category booking details.
//
// Every category asks the renter for different things, so each one gets its own
// one-to-one table keyed by reservationId. A booking has a row in exactly one
// of these — whichever matches its product's category. The shared fields that
// every booking needs (dates, contact, purpose, handover, valid ID) stay on
// `reservations` itself.
//
// Adding a field to a category means a column here plus a migration; adding a
// whole category means a new entity in this file. `CATEGORY_DETAIL_KEYS` maps
// the storefront category names onto these tables.
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { DriverOption, Reservation } from './reservation.entity';

// Which detail table a storefront category uses.
export const CATEGORY_DETAIL_KEYS = {
  Vehicles: 'vehicle',
  'Events & Party': 'event',
  'Audio & Video': 'audio',
  Photography: 'photo',
  'Tools & Equipment': 'tool',
  'Sports & Outdoor': 'sport',
  'Property & Spaces': 'space',
  Other: 'other',
} as const;

export type CategoryDetailKey =
  (typeof CATEGORY_DETAIL_KEYS)[keyof typeof CATEGORY_DETAIL_KEYS];

export function detailKeyForCategory(
  category?: string | null,
): CategoryDetailKey {
  return CATEGORY_DETAIL_KEYS[category as keyof typeof CATEGORY_DETAIL_KEYS] ?? 'other';
}

// Shared base: the reservationId doubles as the primary key, so a booking can
// never have two rows in the same detail table.
abstract class DetailBase {
  @PrimaryColumn({ type: 'int' })
  reservationId!: number;

  @OneToOne(() => Reservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationId' })
  reservation!: Reservation;
}

// ── Vehicles ──────────────────────────────────────────
@Entity({ name: 'reservation_vehicle_details' })
export class ReservationVehicleDetails extends DetailBase {
  // Self drive or with a driver provided by the owner.
  @Column({ type: 'varchar', length: 20, nullable: true })
  driverOption!: DriverOption | null;

  // Licence photo — only required for self drive.
  @Column({ type: 'varchar', length: 255, nullable: true })
  licenseIdUrl!: string | null;
}

// ── Events & Party ────────────────────────────────────
@Entity({ name: 'reservation_event_details' })
export class ReservationEventDetails extends DetailBase {
  @Column({ type: 'varchar', length: 60, nullable: true })
  eventType!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  venue!: string | null;

  @Column({ type: 'int', nullable: true })
  guestCount!: number | null;

  // How many sets/units of the item are needed.
  @Column({ type: 'int', nullable: true })
  quantity!: number | null;

  // Whether the owner should set up and tear down.
  @Column({ type: 'boolean', nullable: true })
  setupNeeded!: boolean | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  setupTime!: string | null;

  @Column({ type: 'boolean', nullable: true })
  isOutdoor!: boolean | null;
}

// ── Audio & Video ─────────────────────────────────────
@Entity({ name: 'reservation_audio_details' })
export class ReservationAudioDetails extends DetailBase {
  @Column({ type: 'varchar', length: 200, nullable: true })
  venue!: string | null;

  @Column({ type: 'int', nullable: true })
  audienceSize!: number | null;

  // 'outlet' | 'generator' | 'none' — what power is available on site.
  @Column({ type: 'varchar', length: 20, nullable: true })
  powerSource!: string | null;

  // Whether the owner should send a technician to operate the gear.
  @Column({ type: 'boolean', nullable: true })
  operatorNeeded!: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  isOutdoor!: boolean | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  setupTime!: string | null;
}

// ── Photography ───────────────────────────────────────
@Entity({ name: 'reservation_photo_details' })
export class ReservationPhotoDetails extends DetailBase {
  @Column({ type: 'varchar', length: 60, nullable: true })
  shootType!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  shootLocation!: string | null;

  // Owners of expensive glass/drones care about this.
  @Column({ type: 'varchar', length: 30, nullable: true })
  experienceLevel!: string | null;

  @Column({ type: 'text', nullable: true })
  accessories!: string | null;
}

// ── Tools & Equipment ─────────────────────────────────
@Entity({ name: 'reservation_tool_details' })
export class ReservationToolDetails extends DetailBase {
  @Column({ type: 'varchar', length: 200, nullable: true })
  siteAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  jobDescription!: string | null;

  // Whether the owner should send a trained operator.
  @Column({ type: 'boolean', nullable: true })
  operatorNeeded!: boolean | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  powerSource!: string | null;

  // Expected running hours per day, for wear/fuel estimates.
  @Column({ type: 'int', nullable: true })
  shiftHoursPerDay!: number | null;
}

// ── Sports & Outdoor ──────────────────────────────────
@Entity({ name: 'reservation_sport_details' })
export class ReservationSportDetails extends DetailBase {
  @Column({ type: 'varchar', length: 60, nullable: true })
  activity!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  destination!: string | null;

  @Column({ type: 'int', nullable: true })
  participantCount!: number | null;

  // Sizes needed, e.g. "2 × medium helmets, 1 × large wetsuit".
  @Column({ type: 'varchar', length: 200, nullable: true })
  sizeNotes!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  experienceLevel!: string | null;
}

// ── Property & Spaces ─────────────────────────────────
@Entity({ name: 'reservation_space_details' })
export class ReservationSpaceDetails extends DetailBase {
  @Column({ type: 'varchar', length: 60, nullable: true })
  useType!: string | null;

  @Column({ type: 'int', nullable: true })
  occupantCount!: number | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  checkInTime!: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  checkOutTime!: string | null;

  @Column({ type: 'boolean', nullable: true })
  overnightStay!: boolean | null;
}

// ── Other ─────────────────────────────────────────────
@Entity({ name: 'reservation_other_details' })
export class ReservationOtherDetails extends DetailBase {
  @Column({ type: 'text', nullable: true })
  useDescription!: string | null;

  @Column({ type: 'int', nullable: true })
  quantity!: number | null;

  @Column({ type: 'int', nullable: true })
  headcount!: number | null;
}

// Every detail entity, in the order the keys above declare them.
export const DETAIL_ENTITIES = [
  ReservationVehicleDetails,
  ReservationEventDetails,
  ReservationAudioDetails,
  ReservationPhotoDetails,
  ReservationToolDetails,
  ReservationSportDetails,
  ReservationSpaceDetails,
  ReservationOtherDetails,
];
