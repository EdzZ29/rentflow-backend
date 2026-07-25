import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AuthUser } from '../auth/auth.types';
import { ProductsService } from '../products/products.service';
import { ReviewsService } from '../reviews/reviews.service';
import { businessLimitFor, effectivePlan } from '../subscription/plan-limits';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { Business, BusinessPlan, BusinessStatus } from './entities/business.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessesRepository: Repository<Business>,
    private readonly usersService: UsersService,
    private readonly products: ProductsService,
    private readonly reviews: ReviewsService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(dto: CreateBusinessDto, actor: AuthUser): Promise<Business> {
    const owner = await this.usersService.findOne(actor.id);
    const limit = businessLimitFor(owner);
    const count = await this.businessesRepository.count({
      where: { ownerId: actor.id },
    });

    if (limit === 0) {
      throw new ForbiddenException(
        'Your trial has ended. Subscribe to a plan to add businesses.',
      );
    }
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${effectivePlan(owner)} plan allows up to ${limit} business(es). Upgrade to add more.`,
      );
    }

    const business = this.businessesRepository.create({
      ...dto,
      ownerId: actor.id,
    });
    const saved = await this.businessesRepository.save(business);
    await this.activity.safeRecord({
      userId: saved.ownerId,
      category: 'business',
      action: 'created',
      title: 'Business created',
      description: `Added business "${saved.name}"`,
      entityName: saved.name,
    });
    return saved;
  }

  findAll(actor: AuthUser): Promise<Business[]> {
    // Admins see everything (with owner info); owners see only their own.
    if (actor.role === UserRole.ADMIN) {
      return this.businessesRepository.find({
        relations: { owner: true },
        order: { createdAt: 'DESC' },
      });
    }
    return this.businessesRepository.find({
      where: { ownerId: actor.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, actor: AuthUser): Promise<Business> {
    const business = await this.businessesRepository.findOne({ where: { id } });
    if (!business) {
      throw new NotFoundException(`Business ${id} not found`);
    }
    this.assertAccess(business, actor);
    return business;
  }

  async update(
    id: number,
    dto: UpdateBusinessDto,
    actor: AuthUser,
  ): Promise<Business> {
    await this.findOne(id, actor); // enforces access + existence
    const business = await this.businessesRepository.preload({ id, ...dto });
    const saved = await this.businessesRepository.save(business!);
    await this.activity.safeRecord({
      userId: saved.ownerId,
      category: 'business',
      action: 'updated',
      title: 'Business updated',
      description: `Updated business "${saved.name}"`,
      entityName: saved.name,
    });
    return saved;
  }

  async remove(id: number, actor: AuthUser): Promise<void> {
    const business = await this.findOne(id, actor);
    await this.businessesRepository.delete(id);
    await this.activity.safeRecord({
      userId: business.ownerId,
      category: 'business',
      action: 'deleted',
      title: 'Business deleted',
      description: `Deleted business "${business.name}"`,
      entityName: business.name,
    });
  }

  async setImage(id: number, imageUrl: string, actor: AuthUser) {
    const business = await this.findOne(id, actor); // enforces ownership
    await this.businessesRepository.update(id, { imageUrl });
    await this.activity.safeRecord({
      userId: business.ownerId,
      category: 'business',
      action: 'updated',
      title: 'Business photo updated',
      description: `Changed the photo for "${business.name}"`,
      entityName: business.name,
    });
    return this.businessesRepository.findOne({ where: { id } });
  }

  private assertAccess(business: Business, actor: AuthUser) {
    if (actor.role !== UserRole.ADMIN && business.ownerId !== actor.id) {
      throw new ForbiddenException('You do not own this business');
    }
  }

  // ── Public browsing (no auth) ─────────────────────────
  async browse(filter: { category?: string; q?: string }) {
    const qb = this.businessesRepository
      .createQueryBuilder('b')
      .leftJoin('b.owner', 'owner')
      .addSelect(['owner.fullName'])
      .where('b.status = :status', { status: BusinessStatus.ACTIVE })
      // Only businesses on the Marketplace plan appear publicly.
      .andWhere('b.subscriptionType = :plan', { plan: BusinessPlan.MARKETPLACE });

    if (filter.category) {
      qb.andWhere('b.category = :category', { category: filter.category });
    }
    if (filter.q) {
      qb.andWhere(
        '(b.name ILIKE :q OR b.description ILIKE :q OR b.location ILIKE :q)',
        { q: `%${filter.q}%` },
      );
    }

    const rows = await qb.orderBy('b.createdAt', 'DESC').getMany();
    const ratings = await this.reviews.summaryByBusiness(rows.map((b) => b.id));
    return rows.map((b) => this.toPublic(b, ratings[b.id]));
  }

  async findPublicOne(id: number) {
    const business = await this.businessesRepository.findOne({
      where: {
        id,
        status: BusinessStatus.ACTIVE,
        subscriptionType: BusinessPlan.MARKETPLACE,
      },
      relations: { owner: true },
    });
    if (!business) {
      throw new NotFoundException('Rental not found');
    }
    const [rating, products] = await Promise.all([
      this.reviews.summaryForBusiness(business.id),
      this.products.publicByBusiness(business.id),
    ]);
    return { ...this.toPublic(business, rating), products };
  }

  /** Only expose safe, non-sensitive fields to the public. */
  private toPublic(b: Business, rating?: { rating: number; reviewCount: number }) {
    return {
      id: b.id,
      name: b.name,
      category: b.category,
      description: b.description,
      location: b.location,
      imageUrl: b.imageUrl,
      ownerName: b.owner?.fullName ?? null,
      rating: rating?.rating ?? 0,
      reviewCount: rating?.reviewCount ?? 0,
      createdAt: b.createdAt,
    };
  }
}
