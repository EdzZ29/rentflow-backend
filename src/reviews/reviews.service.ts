import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { Product } from '../products/entities/product.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';

export interface RatingSummary {
  rating: number; // average, rounded to 1 decimal (0 when no reviews)
  reviewCount: number;
}

export interface BusinessRatingBreakdown {
  stars: Record<number, number>; // reviews per star, 1–5
  ratedItemCount: number; // how many of the business's items have reviews
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  // A customer may review a product only if they have booked/reserved it
  // (any status except a cancelled one).
  async canReview(productId: number, customerId: number): Promise<boolean> {
    const count = await this.reservationsRepository.count({
      where: {
        productId,
        customerId,
        status: Not(ReservationStatus.CANCELLED),
      },
    });
    return count > 0;
  }

  // The current customer's own reviews (used by the dashboard to show which
  // items they've already reviewed).
  async listMine(customerId: number) {
    const rows = await this.reviewsRepository.find({
      where: { customerId },
      order: { updatedAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      rating: r.rating,
      comment: r.comment,
      updatedAt: r.updatedAt,
    }));
  }

  // Public list of reviews for a product, newest first, with the author's name.
  async listForProduct(productId: number) {
    const rows = await this.reviewsRepository
      .createQueryBuilder('r')
      .leftJoin('r.customer', 'c')
      .addSelect(['c.id', 'c.fullName', 'c.avatarUrl'])
      .where('r.productId = :productId', { productId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();

    return rows.map((r) => this.toPublic(r));
  }

  // Average rating + count for many products at once (for browse cards).
  async summaryByProduct(
    productIds: number[],
  ): Promise<Record<number, RatingSummary>> {
    if (!productIds.length) return {};
    const rows = await this.reviewsRepository
      .createQueryBuilder('r')
      .select('r.productId', 'productId')
      .addSelect('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.productId IN (:...ids)', { ids: productIds })
      .groupBy('r.productId')
      .getRawMany<{ productId: number; avg: string; cnt: string }>();

    return Object.fromEntries(
      rows.map((r) => [
        Number(r.productId),
        {
          rating: Math.round(Number(r.avg) * 10) / 10,
          reviewCount: Number(r.cnt),
        },
      ]),
    );
  }

  async summaryForOne(productId: number): Promise<RatingSummary> {
    const map = await this.summaryByProduct([productId]);
    return map[productId] ?? { rating: 0, reviewCount: 0 };
  }

  // A business's rating is the average across all reviews of its products.
  // Used for business + package cards, which have no reviews of their own.
  async summaryByBusiness(
    businessIds: number[],
  ): Promise<Record<number, RatingSummary>> {
    if (!businessIds.length) return {};
    const rows = await this.reviewsRepository
      .createQueryBuilder('r')
      .innerJoin('r.product', 'p')
      .select('p.businessId', 'businessId')
      .addSelect('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.businessId IN (:...ids)', { ids: businessIds })
      .groupBy('p.businessId')
      .getRawMany<{ businessId: number; avg: string; cnt: string }>();

    return Object.fromEntries(
      rows.map((r) => [
        Number(r.businessId),
        {
          rating: Math.round(Number(r.avg) * 10) / 10,
          reviewCount: Number(r.cnt),
        },
      ]),
    );
  }

  async summaryForBusiness(businessId: number): Promise<RatingSummary> {
    const map = await this.summaryByBusiness([businessId]);
    return map[businessId] ?? { rating: 0, reviewCount: 0 };
  }

  // How the business's overall rating breaks down by star, plus how many of
  // its items have been reviewed. Powers the "overall rating" panel on the
  // public business page — a business has no reviews of its own, so this is
  // always an aggregate of its products' reviews.
  async breakdownForBusiness(
    businessId: number,
  ): Promise<BusinessRatingBreakdown> {
    const [rows, distinct] = await Promise.all([
      this.reviewsRepository
        .createQueryBuilder('r')
        .innerJoin('r.product', 'p')
        .select('r.rating', 'rating')
        .addSelect('COUNT(*)', 'cnt')
        .where('p.businessId = :businessId', { businessId })
        .groupBy('r.rating')
        .getRawMany<{ rating: number; cnt: string }>(),
      // Counted separately: grouping by star would count an item once per star.
      this.reviewsRepository
        .createQueryBuilder('r')
        .innerJoin('r.product', 'p')
        .select('COUNT(DISTINCT r.productId)', 'items')
        .where('p.businessId = :businessId', { businessId })
        .getRawOne<{ items: string }>(),
    ]);

    const stars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) {
      stars[Number(row.rating)] = Number(row.cnt);
    }

    return { stars, ratedItemCount: Number(distinct?.items) || 0 };
  }

  // Customer posts (or updates) their review for a product.
  async createOrUpdate(
    productId: number,
    dto: CreateReviewDto,
    actor: AuthUser,
  ) {
    if (actor.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can review products.');
    }
    const product = await this.productsRepository.findOne({
      where: { id: productId },
      relations: { business: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!(await this.canReview(productId, actor.id))) {
      throw new ForbiddenException(
        'You can only review items you have booked or reserved.',
      );
    }

    const existing = await this.reviewsRepository.findOne({
      where: { productId, customerId: actor.id },
    });
    const review = existing
      ? this.reviewsRepository.merge(existing, {
          rating: dto.rating,
          comment: dto.comment ?? null,
        })
      : this.reviewsRepository.create({
          productId,
          customerId: actor.id,
          rating: dto.rating,
          comment: dto.comment ?? null,
        });

    const saved = await this.reviewsRepository.save(review);

    // Tell the owner in real time (and, for brand-new reviews, notify them).
    const ownerId = product.business?.ownerId;
    if (ownerId) {
      this.realtime.emitToUser(ownerId, {
        type: 'review',
        action: 'created',
        reviewId: saved.id,
      });
      if (!existing) {
        await this.safeNotify({
          userId: ownerId,
          type: 'review.created',
          title: `New ${dto.rating}★ review`,
          body: `${product.name} was reviewed by a customer.`,
          link: '/owner/reviews',
        });
      }
    }

    const withAuthor = await this.reviewsRepository.findOne({
      where: { id: saved.id },
      relations: { customer: true },
    });
    return this.toPublic(withAuthor!);
  }

  // ── Owner side: analytics feed + reply management ─────
  // Every review across the products of the owner's businesses.
  async listForOwner(ownerId: number) {
    const rows = await this.reviewsRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.product', 'p')
      .innerJoinAndSelect('p.business', 'b')
      .leftJoin('r.customer', 'c')
      .addSelect(['c.id', 'c.fullName'])
      .where('b.ownerId = :ownerId', { ownerId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();

    return rows.map((r) => this.toOwnerView(r));
  }

  // Owner (or admin) replies to a review on one of their products.
  async reply(reviewId: number, text: string, actor: AuthUser) {
    const review = await this.loadOwnedReview(reviewId, actor);
    review.ownerReply = text;
    review.repliedAt = new Date();
    const saved = await this.reviewsRepository.save(review);

    // Let the reviewer know their feedback got a response.
    await this.safeNotify({
      userId: review.customerId,
      type: 'review.replied',
      title: 'The owner replied to your review',
      body: `${review.product?.name ?? 'Your rental'} — see what they said.`,
      link: `/rentals/product/${review.productId}`,
    });
    this.realtime.emitToUser(review.customerId, {
      type: 'review',
      action: 'replied',
      reviewId: saved.id,
    });
    return this.toOwnerView(saved);
  }

  async deleteReply(reviewId: number, actor: AuthUser) {
    const review = await this.loadOwnedReview(reviewId, actor);
    review.ownerReply = null;
    review.repliedAt = null;
    const saved = await this.reviewsRepository.save(review);
    return this.toOwnerView(saved);
  }

  // Load a review with its product/business/customer and assert the actor owns it.
  private async loadOwnedReview(
    reviewId: number,
    actor: AuthUser,
  ): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
      relations: { product: { business: true }, customer: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (
      actor.role !== UserRole.ADMIN &&
      review.product?.business?.ownerId !== actor.id
    ) {
      throw new ForbiddenException('You do not own this product.');
    }
    return review;
  }

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

  private toPublic(r: Review) {
    return {
      id: r.id,
      productId: r.productId,
      rating: r.rating,
      comment: r.comment,
      authorName: r.customer?.fullName ?? 'Customer',
      authorAvatar: r.customer?.avatarUrl ?? null,
      ownerReply: r.ownerReply,
      repliedAt: r.repliedAt,
      createdAt: r.createdAt,
    };
  }

  // Richer shape for the owner dashboard (includes product + business).
  private toOwnerView(r: Review) {
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      authorName: r.customer?.fullName ?? 'Customer',
      ownerReply: r.ownerReply,
      repliedAt: r.repliedAt,
      createdAt: r.createdAt,
      product: r.product ? { id: r.product.id, name: r.product.name } : null,
      business: r.product?.business
        ? { id: r.product.business.id, name: r.product.business.name }
        : null,
    };
  }
}
