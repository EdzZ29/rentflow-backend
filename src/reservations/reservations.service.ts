import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AuthUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { Product, ProductAvailability } from '../products/entities/product.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { isPlanActive } from '../subscription/plan-limits';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateOwnerBookingDto } from './dto/create-owner-booking.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { REQUIRED_DETAIL_FIELDS } from './dto/category-details.dto';
import {
  CategoryDetailKey,
  detailKeyForCategory,
  ReservationAudioDetails,
  ReservationEventDetails,
  ReservationOtherDetails,
  ReservationPhotoDetails,
  ReservationSpaceDetails,
  ReservationSportDetails,
  ReservationToolDetails,
  ReservationVehicleDetails,
} from './entities/category-details.entity';
import {
  BookingType,
  HandoverMethod,
  Reservation,
  ReservationStatus,
} from './entities/reservation.entity';

// Only these fields exist in each category's table — anything else the client
// sends is ignored rather than written to the wrong place.
const DETAIL_COLUMNS: Record<CategoryDetailKey, string[]> = {
  vehicle: ['driverOption', 'licenseIdUrl'],
  event: [
    'eventType',
    'venue',
    'guestCount',
    'quantity',
    'setupNeeded',
    'setupTime',
    'isOutdoor',
  ],
  audio: [
    'venue',
    'audienceSize',
    'powerSource',
    'operatorNeeded',
    'isOutdoor',
    'setupTime',
  ],
  photo: ['shootType', 'shootLocation', 'experienceLevel', 'accessories'],
  tool: [
    'siteAddress',
    'jobDescription',
    'operatorNeeded',
    'powerSource',
    'shiftHoursPerDay',
  ],
  sport: [
    'activity',
    'destination',
    'participantCount',
    'sizeNotes',
    'experienceLevel',
  ],
  space: [
    'useType',
    'occupantCount',
    'checkInTime',
    'checkOutTime',
    'overnightStay',
  ],
  other: ['useDescription', 'quantity', 'headcount'],
};

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ReservationVehicleDetails)
    private readonly vehicleDetails: Repository<ReservationVehicleDetails>,
    @InjectRepository(ReservationEventDetails)
    private readonly eventDetails: Repository<ReservationEventDetails>,
    @InjectRepository(ReservationAudioDetails)
    private readonly audioDetails: Repository<ReservationAudioDetails>,
    @InjectRepository(ReservationPhotoDetails)
    private readonly photoDetails: Repository<ReservationPhotoDetails>,
    @InjectRepository(ReservationToolDetails)
    private readonly toolDetails: Repository<ReservationToolDetails>,
    @InjectRepository(ReservationSportDetails)
    private readonly sportDetails: Repository<ReservationSportDetails>,
    @InjectRepository(ReservationSpaceDetails)
    private readonly spaceDetails: Repository<ReservationSpaceDetails>,
    @InjectRepository(ReservationOtherDetails)
    private readonly otherDetails: Repository<ReservationOtherDetails>,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly usersService: UsersService,
    private readonly activity: ActivityLogService,
  ) {}

  // The repository holding a given category's details.
  private detailRepo(key: CategoryDetailKey): Repository<{ reservationId: number }> {
    const repos = {
      vehicle: this.vehicleDetails,
      event: this.eventDetails,
      audio: this.audioDetails,
      photo: this.photoDetails,
      tool: this.toolDetails,
      sport: this.sportDetails,
      space: this.spaceDetails,
      other: this.otherDetails,
    };
    return repos[key] as unknown as Repository<{ reservationId: number }>;
  }

  // Load a booking's category details, tagged with which category they're from.
  async loadDetails(reservationId: number, category?: string | null) {
    const key = detailKeyForCategory(category);
    const row = await this.detailRepo(key).findOne({ where: { reservationId } });
    return { categoryKey: key, ...(row ?? {}) };
  }

  async create(dto: CreateReservationDto, actor: AuthUser): Promise<Reservation> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
      relations: { business: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.availability !== ProductAvailability.AVAILABLE) {
      throw new BadRequestException('This product is not available to reserve.');
    }
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date must be after the start date.');
    }
    if (!dto.agreedToTerms) {
      throw new BadRequestException(
        'You must agree to the rental terms to continue.',
      );
    }
    // Each category has its own mandatory questions.
    const detailKey = detailKeyForCategory(product.business?.category);
    const details = (dto.categoryDetails ?? {}) as Record<string, unknown>;
    for (const { field, message } of REQUIRED_DETAIL_FIELDS[detailKey]) {
      const value = details[field];
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(message);
      }
    }

    const reservation = this.reservationsRepository.create({
      productId: dto.productId,
      customerId: actor.id,
      type: dto.type,
      startDate: dto.startDate,
      endDate: dto.endDate,
      contactPhone: dto.contactPhone,
      paymentMethod: dto.paymentMethod,
      agreedToTerms: dto.agreedToTerms,
      note: dto.note ?? null,
      purpose: dto.purpose ?? null,
      handoverMode: dto.handoverMode ?? null,
      pickupLocation: dto.pickupLocation ?? null,
      dropoffLocation: dto.dropoffLocation ?? null,
      pickupTime: dto.pickupTime ?? null,
      dropoffTime: dto.dropoffTime ?? null,
      validIdType: dto.validIdType ?? null,
      // The QR the owner scans at handover.
      // The return code is minted later, at the moment of release.
      releaseToken: randomBytes(24).toString('hex'),
      status: ReservationStatus.PENDING,
    });
    const saved = await this.reservationsRepository.save(reservation);

    // Store the category-specific answers in that category's own table,
    // keeping only the columns that table actually has.
    const row: Record<string, unknown> = { reservationId: saved.id };
    for (const column of DETAIL_COLUMNS[detailKey]) {
      if (details[column] !== undefined) row[column] = details[column];
    }
    await this.detailRepo(detailKey).save(row as { reservationId: number });

    // Notify the business owner and refresh everyone's lists in real time.
    const ownerId = product.business?.ownerId;
    const label = dto.type === 'reserve' ? 'reservation' : 'booking';
    if (ownerId) {
      await this.safeNotify({
        userId: ownerId,
        type: 'booking.created',
        title: `New ${label} request`,
        body: `${product.name} · ${dto.startDate} → ${dto.endDate}`,
        link: '/owner/bookings',
      });
      await this.activity.safeRecord({
        userId: ownerId,
        category: 'booking',
        action: 'booked',
        title: `New ${label} received`,
        description: `${product.name} · ${dto.startDate} → ${dto.endDate}`,
        entityName: product.name,
      });
    }
    this.broadcastReservationChange(saved.id, 'created', ownerId, actor.id);
    return saved;
  }

  // Owner (or admin) manually records a booking for a walk-in customer. The
  // customer is resolved/created by email. Requires ownership of the product;
  // plan-expiry is enforced by PlanActiveGuard on the route.
  async createForOwner(
    dto: CreateOwnerBookingDto,
    actor: AuthUser,
  ): Promise<Reservation> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
      relations: { business: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const ownerId = product.business?.ownerId;
    if (actor.role !== UserRole.ADMIN && ownerId !== actor.id) {
      throw new ForbiddenException('You do not own this product.');
    }
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('End date must be after the start date.');
    }

    const customer = await this.usersService.findOrCreateCustomer(
      dto.customerName,
      dto.customerEmail,
    );

    const reservation = this.reservationsRepository.create({
      productId: product.id,
      customerId: customer.id,
      type: BookingType.BOOK,
      startDate: dto.startDate,
      endDate: dto.endDate,
      contactPhone: dto.customerPhone ?? null,
      paymentMethod: 'manual',
      agreedToTerms: true,
      note: dto.note ?? null,
      status:
        dto.status === 'pending'
          ? ReservationStatus.PENDING
          : ReservationStatus.CONFIRMED,
    });
    const saved = await this.reservationsRepository.save(reservation);

    // Keep the invariant that every booking has exactly one detail row, even
    // when the owner records it manually and answers nothing.
    await this.detailRepo(
      detailKeyForCategory(product.business?.category),
    ).save({ reservationId: saved.id });

    // Notify the customer, log it for the owner, and refresh lists live.
    await this.safeNotify({
      userId: customer.id,
      type: 'booking.created',
      title: 'A booking was made for you',
      body: `${product.name} · ${dto.startDate} → ${dto.endDate}`,
      link: '/customer/bookings',
    });
    if (ownerId) {
      await this.activity.safeRecord({
        userId: ownerId,
        category: 'booking',
        action: 'booked',
        title: 'Custom booking created',
        description: `${product.name} for ${customer.fullName} · ${dto.startDate} → ${dto.endDate}`,
        entityName: product.name,
      });
    }
    this.broadcastReservationChange(saved.id, 'created', ownerId, customer.id);
    return saved;
  }

  async findAll(actor: AuthUser) {
    const qb = this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.product', 'p')
      .leftJoin('p.business', 'b')
      .addSelect(['b.id', 'b.name', 'b.ownerId', 'b.category'])
      .leftJoin('r.customer', 'c')
      .addSelect(['c.id', 'c.fullName', 'c.email'])
      .orderBy('r.createdAt', 'DESC');

    if (actor.role === UserRole.OWNER) {
      qb.where('b.ownerId = :uid', { uid: actor.id });
    } else if (actor.role === UserRole.CUSTOMER) {
      qb.where('r.customerId = :uid', { uid: actor.id });
    }
    // admin: no filter
    const rows = await qb.getMany();

    // Attach each booking's category-specific details. Grouped by category so
    // it's one query per detail table involved, not one per booking.
    const byKey = new Map<CategoryDetailKey, Reservation[]>();
    for (const r of rows) {
      const key = detailKeyForCategory(r.product?.business?.category);
      const list = byKey.get(key);
      if (list) list.push(r);
      else byKey.set(key, [r]);
    }

    const detailsById = new Map<number, Record<string, unknown>>();
    await Promise.all(
      [...byKey.entries()].map(async ([key, group]) => {
        const found = await this.detailRepo(key).find({
          where: { reservationId: In(group.map((r) => r.id)) },
        });
        for (const row of found) {
          detailsById.set(row.reservationId, { categoryKey: key, ...row });
        }
      }),
    );

    return rows.map((r) => ({
      ...r,
      category: r.product?.business?.category ?? null,
      details:
        detailsById.get(r.id) ?? {
          categoryKey: detailKeyForCategory(r.product?.business?.category),
        },
    }));
  }

  async updateStatus(
    id: number,
    status: ReservationStatus,
    actor: AuthUser,
  ): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: { product: { business: true } },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // 'released' is only ever reached by scanning the release QR or pressing
    // Release, so that releasedAt/releaseMethod are always recorded with it.
    if (status === ReservationStatus.RELEASED) {
      throw new BadRequestException(
        'Release a unit by scanning its QR code or using the Release action.',
      );
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    const isBusinessOwner = reservation.product.business.ownerId === actor.id;
    const isReservationCustomer = reservation.customerId === actor.id;

    if (status === ReservationStatus.CANCELLED) {
      if (!isAdmin && !isBusinessOwner && !isReservationCustomer) {
        throw new ForbiddenException('You cannot cancel this reservation.');
      }
    } else if (!isAdmin && !isBusinessOwner) {
      throw new ForbiddenException('Only the business owner can update this.');
    }

    // Approving/completing is a paid feature: an owner with a lapsed plan can
    // still view and cancel, but must re-subscribe to confirm or complete.
    if (
      isBusinessOwner &&
      !isAdmin &&
      (status === ReservationStatus.CONFIRMED ||
        status === ReservationStatus.COMPLETED)
    ) {
      const owner = await this.usersService.findOne(actor.id);
      if (!isPlanActive(owner)) {
        throw new ForbiddenException(
          'Your plan has expired. Subscribe to a plan to manage bookings.',
        );
      }
    }

    reservation.status = status;
    const saved = await this.reservationsRepository.save(reservation);

    const ownerId = reservation.product.business.ownerId;
    const customerId = reservation.customerId;
    const productName = reservation.product.name;

    // Record the change in the owner's activity log.
    await this.activity.safeRecord({
      userId: ownerId,
      category: 'booking',
      action: status,
      title: `Booking ${status}`,
      description: `${productName} · ${reservation.startDate} → ${reservation.endDate}`,
      entityName: productName,
    });

    // Notify the party who did NOT make the change.
    if (actor.id === customerId) {
      // Customer cancelled → tell the owner.
      await this.safeNotify({
        userId: ownerId,
        type: `booking.${status}`,
        title: 'Booking cancelled',
        body: `${productName} was cancelled by the customer.`,
        link: '/owner/bookings',
      });
    } else {
      // Owner/admin changed the status → tell the customer.
      const messages: Record<string, string> = {
        [ReservationStatus.CONFIRMED]: 'Your booking has been confirmed.',
        [ReservationStatus.COMPLETED]: 'Your booking is now complete.',
        [ReservationStatus.CANCELLED]: 'Your booking was cancelled.',
      };
      await this.safeNotify({
        userId: customerId,
        type: `booking.${status}`,
        title: `Booking ${status}`,
        body: `${productName} — ${messages[status] ?? `Status updated to ${status}.`}`,
        link: '/customer/bookings',
      });
      // Once a rental is complete, prompt the customer to leave a review.
      if (status === ReservationStatus.COMPLETED) {
        await this.safeNotify({
          userId: customerId,
          type: 'review.request',
          title: 'How was your rental?',
          body: `Leave a review for ${productName} to help other renters.`,
          link: '/customer/reviews',
        });
      }
    }

    this.broadcastReservationChange(saved.id, 'updated', ownerId, customerId);
    return saved;
  }

  // ── Requirement documents ─────────────────────────────
  // Attach an uploaded valid ID / driver's licence to a booking. Only the
  // customer who made the booking (or an admin) may upload.
  async attachDocument(
    id: number,
    kind: 'validId' | 'licenseId',
    url: string,
    actor: AuthUser,
  ): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: { product: { business: true } },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (actor.role !== UserRole.ADMIN && reservation.customerId !== actor.id) {
      throw new ForbiddenException('This is not your booking.');
    }

    // A licence is a vehicle-specific requirement, so it lives in that
    // category's detail table; a valid ID applies to every booking.
    if (kind === 'licenseId') {
      const key = detailKeyForCategory(reservation.product?.business?.category);
      if (key !== 'vehicle') {
        throw new BadRequestException(
          'A driver’s licence only applies to vehicle bookings.',
        );
      }
      await this.vehicleDetails.save({
        reservationId: reservation.id,
        licenseIdUrl: url,
      });
      return reservation;
    }

    reservation.validIdUrl = url;
    return this.reservationsRepository.save(reservation);
  }

  // ── Handover QR: release & return ─────────────────────
  // Resolve a scanned code to its booking AND to what it is for. The kind comes
  // from which column matched, never from the request, so a release code can
  // only ever release and a return code can only ever close out a return.
  private async resolveToken(token: string): Promise<{
    reservation: Reservation;
    kind: 'release' | 'return';
  }> {
    // Reject anything that isn't shaped like one of our codes before querying.
    if (!/^[a-f0-9]{48}$/.test(token)) {
      throw new NotFoundException('This booking code is not valid.');
    }
    const reservation = await this.reservationsRepository.findOne({
      where: [{ releaseToken: token }, { returnToken: token }],
      relations: { product: { business: true }, customer: true },
    });
    if (!reservation) {
      throw new NotFoundException('This booking code is not valid.');
    }
    return {
      reservation,
      kind: reservation.releaseToken === token ? 'release' : 'return',
    };
  }

  // Public lookup behind the booking QR. Returns only what an owner needs to
  // verify a handover at the counter — never the full customer record.
  async findByToken(token: string) {
    const { reservation: r, kind } = await this.resolveToken(token);
    const category = r.product?.business?.category ?? null;
    const details = (await this.loadDetails(r.id, category)) as Record<
      string,
      unknown
    >;
    return {
      id: r.id,
      status: r.status,
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
      handoverMode: r.handoverMode,
      pickupLocation: r.pickupLocation,
      dropoffLocation: r.dropoffLocation,
      pickupTime: r.pickupTime,
      dropoffTime: r.dropoffTime,
      purpose: r.purpose,
      note: r.note,
      contactPhone: r.contactPhone,
      // What this particular code is for, and where the booking stands.
      tokenKind: kind,
      releasedAt: r.releasedAt,
      releaseMethod: r.releaseMethod,
      returnedAt: r.returnedAt,
      returnMethod: r.returnMethod,
      validIdType: r.validIdType,
      hasValidId: !!r.validIdUrl,
      hasLicenseId: !!details.licenseIdUrl,
      customerName: r.customer?.fullName ?? 'Customer',
      productName: r.product?.name ?? null,
      businessName: r.product?.business?.name ?? null,
      category,
      // The category's own answers, e.g. { categoryKey: 'event', venue: … }.
      details,
    };
  }

  // Owner scans a code. Whether this releases the unit or closes out its return
  // is decided by which code was scanned, not by the caller.
  async scanToken(token: string, actor: AuthUser) {
    const { reservation, kind } = await this.resolveToken(token);
    await this.assertCanHandOver(reservation, actor);

    if (kind === 'release') {
      await this.applyRelease(reservation, HandoverMethod.QR);
      // Re-resolve: the release just minted the return code.
      return this.findByToken(token);
    }
    await this.applyReturn(reservation, HandoverMethod.QR);
    return this.findByToken(token);
  }

  // Owner presses "Release" in the dashboard instead of scanning.
  async releaseManually(id: number, actor: AuthUser) {
    const reservation = await this.loadForHandover(id);
    await this.assertCanHandOver(reservation, actor);
    await this.applyRelease(reservation, HandoverMethod.MANUAL);
    return reservation;
  }

  // Owner presses "Mark returned" instead of scanning the return code.
  async returnManually(id: number, actor: AuthUser) {
    const reservation = await this.loadForHandover(id);
    await this.assertCanHandOver(reservation, actor);
    await this.applyReturn(reservation, HandoverMethod.MANUAL);
    return reservation;
  }

  private async loadForHandover(id: number): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: { product: { business: true } },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
  }

  // Only the item's owner (or an admin) may release or accept a return, and an
  // owner whose plan has lapsed can't either — same rule as confirming.
  private async assertCanHandOver(
    reservation: Reservation,
    actor: AuthUser,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;

    const ownerId = reservation.product?.business?.ownerId;
    if (ownerId !== actor.id) {
      throw new ForbiddenException(
        'Only the owner of this item can record this handover.',
      );
    }
    const owner = await this.usersService.findOne(actor.id);
    if (!isPlanActive(owner)) {
      throw new ForbiddenException(
        'Your plan has expired. Subscribe to a plan to manage bookings.',
      );
    }
  }

  // Hand the unit over. Guards make this single-use: a second scan of the same
  // code finds releasedAt already set and is rejected rather than re-releasing.
  private async applyRelease(
    reservation: Reservation,
    method: HandoverMethod,
  ): Promise<void> {
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('This booking was cancelled.');
    }
    if (reservation.releasedAt) {
      throw new BadRequestException(
        `This unit was already released (${reservation.releaseMethod === HandoverMethod.QR ? 'by QR' : 'manually'}) on ${reservation.releasedAt.toLocaleString()}.`,
      );
    }
    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('This booking is already closed.');
    }
    // Releasing a unit IS the approval — handing it over in person is a
    // stronger signal than pressing Approve, so a still-pending booking is
    // approved as part of the same action rather than being rejected.
    const autoApproved = reservation.status === ReservationStatus.PENDING;

    reservation.releasedAt = new Date();
    reservation.releaseMethod = method;
    reservation.status = ReservationStatus.RELEASED;
    // The return code only comes into existence now, so it can't be captured
    // from the customer's screen and scanned before the unit is actually out.
    reservation.returnToken = randomBytes(24).toString('hex');
    await this.reservationsRepository.save(reservation);

    const ownerId = reservation.product?.business?.ownerId;
    await this.activity.safeRecord({
      userId: ownerId!,
      category: 'booking',
      action: 'released',
      title: method === HandoverMethod.QR ? 'Released by QR' : 'Released',
      description: `${reservation.product?.name ?? 'Item'} handed over to the renter${autoApproved ? ' (approved on release)' : ''}`,
      entityName: reservation.product?.name,
    });
    if (autoApproved) {
      await this.safeNotify({
        userId: reservation.customerId,
        type: 'booking.confirmed',
        title: 'Booking approved',
        body: `${reservation.product?.name ?? 'Your rental'} was approved and released.`,
        link: '/customer/bookings',
      });
    }
    await this.safeNotify({
      userId: reservation.customerId,
      type: 'booking.released',
      title: 'Unit released',
      body: `${reservation.product?.name ?? 'Your rental'} is now yours for the rental period. Show the return QR when you bring it back.`,
      link: '/customer/bookings',
    });
    this.broadcastReservationChange(
      reservation.id,
      'updated',
      ownerId,
      reservation.customerId,
    );
  }

  // Accept the unit back and close the booking out.
  private async applyReturn(
    reservation: Reservation,
    method: HandoverMethod,
  ): Promise<void> {
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('This booking was cancelled.');
    }
    if (!reservation.releasedAt) {
      throw new BadRequestException(
        'This unit has not been released yet, so it cannot be returned.',
      );
    }
    if (reservation.returnedAt) {
      throw new BadRequestException(
        `This unit was already returned on ${reservation.returnedAt.toLocaleString()}.`,
      );
    }

    reservation.returnedAt = new Date();
    reservation.returnMethod = method;
    reservation.status = ReservationStatus.COMPLETED;
    await this.reservationsRepository.save(reservation);

    const ownerId = reservation.product?.business?.ownerId;
    await this.activity.safeRecord({
      userId: ownerId!,
      category: 'booking',
      action: 'returned',
      title: method === HandoverMethod.QR ? 'Returned by QR' : 'Returned',
      description: `${reservation.product?.name ?? 'Item'} came back from the renter`,
      entityName: reservation.product?.name,
    });
    await this.safeNotify({
      userId: reservation.customerId,
      type: 'booking.returned',
      title: 'Return confirmed',
      body: `${reservation.product?.name ?? 'Your rental'} has been returned. Thanks!`,
      link: '/customer/bookings',
    });
    await this.safeNotify({
      userId: reservation.customerId,
      type: 'review.request',
      title: 'How was your rental?',
      body: `Leave a review for ${reservation.product?.name ?? 'your rental'}.`,
      link: '/customer/reviews',
    });
    this.broadcastReservationChange(
      reservation.id,
      'updated',
      ownerId,
      reservation.customerId,
    );
  }

  // Persist + push a notification without letting a notification failure break
  // the booking flow.
  private async safeNotify(input: {
    userId: number;
    type: string;
    title: string;
    body: string;
    link?: string;
  }): Promise<void> {
    try {
      await this.notifications.notify(input);
    } catch {
      /* notifications are best-effort */
    }
  }

  // Tell the owner, the customer, and all admins to refresh their views.
  private broadcastReservationChange(
    reservationId: number,
    action: 'created' | 'updated',
    ownerId: number | undefined,
    customerId: number,
  ): void {
    const event = { type: 'reservation' as const, action, reservationId };
    if (ownerId) this.realtime.emitToUser(ownerId, event);
    this.realtime.emitToUser(customerId, event);
    this.realtime.emitToRole(UserRole.ADMIN, event);
  }
}
