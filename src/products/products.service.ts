import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import {
  Business,
  BusinessStatus,
} from '../businesses/entities/business.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductAvailability } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Business)
    private readonly businessesRepository: Repository<Business>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
  ) {}

  async create(dto: CreateProductDto, actor: AuthUser): Promise<Product> {
    await this.assertOwnsBusiness(dto.businessId, actor);
    const product = this.productsRepository.create(dto);
    return this.productsRepository.save(product);
  }

  async findAllForBusiness(
    businessId: number,
    actor: AuthUser,
  ): Promise<Product[]> {
    await this.assertOwnsBusiness(businessId, actor);
    return this.productsRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, actor: AuthUser): Promise<Product> {
    const product = await this.getOrThrow(id);
    await this.assertOwnsBusiness(product.businessId, actor);
    return product;
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    actor: AuthUser,
  ): Promise<Product> {
    await this.findOne(id, actor);
    const product = await this.productsRepository.preload({ id, ...dto });
    return this.productsRepository.save(product!);
  }

  async setImage(id: number, imageUrl: string, actor: AuthUser) {
    await this.findOne(id, actor);
    await this.productsRepository.update(id, { imageUrl });
    return this.getOrThrow(id);
  }

  async remove(id: number, actor: AuthUser): Promise<void> {
    await this.findOne(id, actor);
    await this.productsRepository.delete(id);
  }

  // ── Public browsing ───────────────────────────────────
  async browse(filter: { category?: string; q?: string }) {
    const qb = this.productsRepository
      .createQueryBuilder('p')
      .innerJoin('p.business', 'b')
      .addSelect(['b.id', 'b.name', 'b.category', 'b.location'])
      .where('p.availability = :avail', {
        avail: ProductAvailability.AVAILABLE,
      })
      .andWhere('b.status = :status', { status: BusinessStatus.ACTIVE });

    if (filter.category) {
      qb.andWhere('b.category = :category', { category: filter.category });
    }
    if (filter.q) {
      qb.andWhere('(p.name ILIKE :q OR p.description ILIKE :q OR b.name ILIKE :q)', {
        q: `%${filter.q}%`,
      });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();
    const counts = await this.bookingCounts(rows.map((p) => p.id));
    return rows.map((p) => this.toPublic(p, counts[p.id] ?? 0));
  }

  async findPublicOne(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id, availability: ProductAvailability.AVAILABLE },
      relations: { business: true },
    });
    if (!product || product.business.status !== BusinessStatus.ACTIVE) {
      throw new NotFoundException('Product not found');
    }
    const counts = await this.bookingCounts([product.id]);
    return this.toPublic(product, counts[product.id] ?? 0);
  }

  /** Number of reservations per product id (a simple popularity metric). */
  private async bookingCounts(ids: number[]): Promise<Record<number, number>> {
    if (!ids.length) return {};
    const rows = await this.reservationsRepository
      .createQueryBuilder('r')
      .select('r.productId', 'productId')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.productId IN (:...ids)', { ids })
      .groupBy('r.productId')
      .getRawMany<{ productId: number; cnt: string }>();
    return Object.fromEntries(rows.map((r) => [Number(r.productId), Number(r.cnt)]));
  }

  private toPublic(p: Product, bookings = 0) {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      pricePerDay: Number(p.pricePerDay),
      currency: p.currency,
      imageUrl: p.imageUrl,
      availability: p.availability,
      businessId: p.businessId,
      businessName: p.business?.name ?? null,
      category: p.business?.category ?? null,
      location: p.business?.location ?? null,
      bookings,
    };
  }

  private async getOrThrow(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  /** Owner may only touch products of businesses they own; admin may touch any. */
  private async assertOwnsBusiness(businessId: number, actor: AuthUser) {
    if (actor.role === UserRole.ADMIN) return;
    const business = await this.businessesRepository.findOne({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    if (business.ownerId !== actor.id) {
      throw new ForbiddenException('You do not own this business');
    }
  }
}
