import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import {
  BookingType,
  Reservation,
  ReservationStatus,
} from './entities/reservation.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly usersService: UsersService,
    private readonly activity: ActivityLogService,
  ) {}

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
      status: ReservationStatus.PENDING,
    });
    const saved = await this.reservationsRepository.save(reservation);

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

  findAll(actor: AuthUser) {
    const qb = this.reservationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.product', 'p')
      .leftJoin('p.business', 'b')
      .addSelect(['b.id', 'b.name', 'b.ownerId'])
      .leftJoin('r.customer', 'c')
      .addSelect(['c.id', 'c.fullName', 'c.email'])
      .orderBy('r.createdAt', 'DESC');

    if (actor.role === UserRole.OWNER) {
      qb.where('b.ownerId = :uid', { uid: actor.id });
    } else if (actor.role === UserRole.CUSTOMER) {
      qb.where('r.customerId = :uid', { uid: actor.id });
    }
    // admin: no filter
    return qb.getMany();
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
    }

    this.broadcastReservationChange(saved.id, 'updated', ownerId, customerId);
    return saved;
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
