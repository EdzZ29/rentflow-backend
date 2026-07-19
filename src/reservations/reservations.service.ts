import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { Product, ProductAvailability } from '../products/entities/product.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Reservation, ReservationStatus } from './entities/reservation.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async create(dto: CreateReservationDto, actor: AuthUser): Promise<Reservation> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
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
    return this.reservationsRepository.save(reservation);
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

    reservation.status = status;
    return this.reservationsRepository.save(reservation);
  }
}
