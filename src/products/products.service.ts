import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AuthUser } from '../auth/auth.types';
import {
  Business,
  BusinessPlan,
  BusinessStatus,
} from '../businesses/entities/business.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReviewsService, RatingSummary } from '../reviews/reviews.service';
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
    private readonly reviews: ReviewsService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(dto: CreateProductDto, actor: AuthUser): Promise<Product> {
    const business = await this.assertOwnsBusiness(dto.businessId, actor);
    const product = this.productsRepository.create(dto);
    const saved = await this.productsRepository.save(product);
    await this.activity.safeRecord({
      userId: business.ownerId,
      category: 'product',
      action: 'created',
      title: 'Product created',
      description: `Added "${saved.name}" to ${business.name}`,
      entityName: saved.name,
    });
    return saved;
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
    const existing = await this.findOne(id, actor);
    const product = await this.productsRepository.preload({ id, ...dto });
    const saved = await this.productsRepository.save(product!);
    await this.logProduct(existing.businessId, 'updated', saved.name, `Updated "${saved.name}"`);
    return saved;
  }

  async setImage(id: number, imageUrl: string, actor: AuthUser) {
    const existing = await this.findOne(id, actor);
    await this.productsRepository.update(id, { imageUrl });
    await this.logProduct(existing.businessId, 'updated', existing.name, `Changed the photo for "${existing.name}"`);
    return this.getOrThrow(id);
  }

  async remove(id: number, actor: AuthUser): Promise<void> {
    const existing = await this.findOne(id, actor);
    await this.productsRepository.delete(id);
    await this.logProduct(existing.businessId, 'deleted', existing.name, `Deleted "${existing.name}"`);
  }

  // Resolve the owning business and write a product activity entry (best-effort).
  private async logProduct(
    businessId: number,
    action: string,
    name: string,
    description: string,
  ): Promise<void> {
    const business = await this.businessesRepository.findOne({
      where: { id: businessId },
    });
    if (!business) return;
    await this.activity.safeRecord({
      userId: business.ownerId,
      category: 'product',
      action,
      title: `Product ${action}`,
      description,
      entityName: name,
    });
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
      // Public marketplace: only published products of active Marketplace businesses.
      .andWhere('p.isPublished = :published', { published: true })
      .andWhere('b.status = :status', { status: BusinessStatus.ACTIVE })
      .andWhere('b.subscriptionType = :plan', { plan: BusinessPlan.MARKETPLACE });

    if (filter.category) {
      qb.andWhere('b.category = :category', { category: filter.category });
    }
    if (filter.q) {
      qb.andWhere('(p.name ILIKE :q OR p.description ILIKE :q OR b.name ILIKE :q)', {
        q: `%${filter.q}%`,
      });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();
    const ids = rows.map((p) => p.id);
    const [counts, ratings] = await Promise.all([
      this.bookingCounts(ids),
      this.reviews.summaryByProduct(ids),
    ]);
    return rows.map((p) => this.toPublic(p, counts[p.id] ?? 0, ratings[p.id]));
  }

  async findPublicOne(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id, availability: ProductAvailability.AVAILABLE, isPublished: true },
      relations: { business: true },
    });
    if (
      !product ||
      product.business.status !== BusinessStatus.ACTIVE ||
      product.business.subscriptionType !== BusinessPlan.MARKETPLACE
    ) {
      throw new NotFoundException('Product not found');
    }
    const counts = await this.bookingCounts([product.id]);
    const rating = await this.reviews.summaryForOne(product.id);
    return this.toPublic(product, counts[product.id] ?? 0, rating);
  }

  // Published, available products of a business (public storefront gating).
  // Optionally excludes one product id and caps the result count.
  async publicByBusiness(businessId: number, excludeId?: number, limit = 24) {
    const qb = this.productsRepository
      .createQueryBuilder('p')
      .innerJoin('p.business', 'b')
      .addSelect(['b.id', 'b.name', 'b.category', 'b.location'])
      .where('p.businessId = :businessId', { businessId })
      .andWhere('p.availability = :avail', {
        avail: ProductAvailability.AVAILABLE,
      })
      .andWhere('p.isPublished = :published', { published: true })
      .andWhere('b.status = :status', { status: BusinessStatus.ACTIVE })
      .andWhere('b.subscriptionType = :plan', { plan: BusinessPlan.MARKETPLACE });

    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });

    const rows = await qb.orderBy('p.createdAt', 'DESC').take(limit).getMany();
    const ids = rows.map((p) => p.id);
    const [counts, ratings] = await Promise.all([
      this.bookingCounts(ids),
      this.reviews.summaryByProduct(ids),
    ]);
    return rows.map((p) => this.toPublic(p, counts[p.id] ?? 0, ratings[p.id]));
  }

  // Other products from the same business (for the "More from this business"
  // section on a product page). Excludes the product being viewed.
  async relatedByBusiness(id: number, limit = 6) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) return [];
    return this.publicByBusiness(product.businessId, id, limit);
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

  private toPublic(p: Product, bookings = 0, rating?: RatingSummary) {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      rentalRules: p.rentalRules,
      cancellationPolicy: p.cancellationPolicy,
      pricePerDay: Number(p.pricePerDay),
      currency: p.currency,
      imageUrl: p.imageUrl,
      availability: p.availability,
      businessId: p.businessId,
      businessName: p.business?.name ?? null,
      category: p.business?.category ?? null,
      location: p.business?.location ?? null,
      bookings,
      rating: rating?.rating ?? 0,
      reviewCount: rating?.reviewCount ?? 0,
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
  private async assertOwnsBusiness(
    businessId: number,
    actor: AuthUser,
  ): Promise<Business> {
    const business = await this.businessesRepository.findOne({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    if (actor.role !== UserRole.ADMIN && business.ownerId !== actor.id) {
      throw new ForbiddenException('You do not own this business');
    }
    return business;
  }
}
