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
import { ReviewsService } from '../reviews/reviews.service';
import { UserRole } from '../users/entities/user.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackageAvailability, RentalPackage } from './entities/package.entity';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(RentalPackage)
    private readonly packagesRepository: Repository<RentalPackage>,
    @InjectRepository(Business)
    private readonly businessesRepository: Repository<Business>,
    private readonly reviews: ReviewsService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(dto: CreatePackageDto, actor: AuthUser): Promise<RentalPackage> {
    const business = await this.assertOwnsBusiness(dto.businessId, actor);
    const pkg = this.packagesRepository.create({
      ...dto,
      items: this.cleanItems(dto.items),
      itemValues: this.cleanItemValues(dto.itemValues),
      options: this.cleanOptions(dto.options),
      tiers: this.cleanTiers(dto.tiers),
    });
    const saved = await this.packagesRepository.save(pkg);
    await this.log(business.ownerId, 'created', saved.name, `Created package "${saved.name}" for ${business.name}`);
    return saved;
  }

  async findAllForBusiness(
    businessId: number,
    actor: AuthUser,
  ): Promise<RentalPackage[]> {
    await this.assertOwnsBusiness(businessId, actor);
    return this.packagesRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, actor: AuthUser): Promise<RentalPackage> {
    const pkg = await this.getOrThrow(id);
    await this.assertOwnsBusiness(pkg.businessId, actor);
    return pkg;
  }

  async update(
    id: number,
    dto: UpdatePackageDto,
    actor: AuthUser,
  ): Promise<RentalPackage> {
    const existing = await this.findOne(id, actor);
    const { items, itemValues, options, tiers, ...rest } = dto;
    const patch: Partial<RentalPackage> = { ...rest };
    if (items !== undefined) patch.items = this.cleanItems(items);
    if (itemValues !== undefined) patch.itemValues = this.cleanItemValues(itemValues);
    if (options !== undefined) patch.options = this.cleanOptions(options);
    if (tiers !== undefined) patch.tiers = this.cleanTiers(tiers);
    const pkg = await this.packagesRepository.preload({ id, ...patch });
    const saved = await this.packagesRepository.save(pkg!);
    await this.log(existing.businessId, 'updated', saved.name, `Updated package "${saved.name}"`, true);
    return saved;
  }

  async remove(id: number, actor: AuthUser): Promise<void> {
    const existing = await this.findOne(id, actor);
    await this.packagesRepository.delete(id);
    await this.log(existing.businessId, 'deleted', existing.name, `Deleted package "${existing.name}"`, true);
  }

  // ── Public browsing ───────────────────────────────────
  // Only published, available packages of active Marketplace businesses appear
  // on the public storefront — the same gating products use.
  async browse(filter: { category?: string; q?: string }) {
    const qb = this.packagesRepository
      .createQueryBuilder('p')
      .innerJoin('p.business', 'b')
      .addSelect(['b.id', 'b.name', 'b.category', 'b.location'])
      .where('p.availability = :avail', {
        avail: PackageAvailability.AVAILABLE,
      })
      .andWhere('p.isPublished = :published', { published: true })
      .andWhere('b.status = :status', { status: BusinessStatus.ACTIVE })
      .andWhere('b.subscriptionType = :plan', {
        plan: BusinessPlan.MARKETPLACE,
      });

    if (filter.category) {
      qb.andWhere('b.category = :category', { category: filter.category });
    }
    if (filter.q) {
      qb.andWhere(
        '(p.name ILIKE :q OR p.description ILIKE :q OR b.name ILIKE :q)',
        { q: `%${filter.q}%` },
      );
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC').getMany();
    const ratings = await this.reviews.summaryByBusiness(
      rows.map((p) => p.businessId),
    );
    return rows.map((p) => this.toPublic(p, ratings[p.businessId]));
  }

  async findPublicOne(id: number) {
    const pkg = await this.packagesRepository.findOne({
      where: { id, availability: PackageAvailability.AVAILABLE, isPublished: true },
      relations: { business: true },
    });
    if (
      !pkg ||
      pkg.business.status !== BusinessStatus.ACTIVE ||
      pkg.business.subscriptionType !== BusinessPlan.MARKETPLACE
    ) {
      throw new NotFoundException('Package not found');
    }
    const rating = await this.reviews.summaryForBusiness(pkg.businessId);
    return this.toPublic(pkg, rating);
  }

  private toPublic(p: RentalPackage, rating?: { rating: number; reviewCount: number }) {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      currency: p.currency,
      priceUnit: p.priceUnit,
      items: p.items ?? [],
      itemValues: p.itemValues ?? [],
      options: p.options ?? [],
      tiers: p.tiers ?? [],
      availability: p.availability,
      businessId: p.businessId,
      businessName: p.business?.name ?? null,
      category: p.business?.category ?? null,
      location: p.business?.location ?? null,
      rating: rating?.rating ?? 0,
      reviewCount: rating?.reviewCount ?? 0,
    };
  }

  // Drop blank lines and trim; keeps the list tidy regardless of client input.
  private cleanItems(items?: string[]): string[] {
    if (!Array.isArray(items)) return [];
    return items.map((i) => String(i).trim()).filter(Boolean);
  }

  private cleanItemValues(
    rows?: { label: string; value: number }[],
  ): { label: string; value: number }[] {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({ label: String(r.label ?? '').trim(), value: Number(r.value) || 0 }))
      .filter((r) => r.label.length > 0);
  }

  private cleanOptions(
    rows?: { name: string; price: number; inclusions?: string[] }[],
  ): { name: string; price: number; inclusions: string[] }[] {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({
        name: String(r.name ?? '').trim(),
        price: Number(r.price) || 0,
        inclusions: this.cleanItems(r.inclusions),
      }))
      .filter((r) => r.name.length > 0);
  }

  private cleanTiers(
    rows?: { price: number; condition: string }[],
  ): { price: number; condition: string }[] {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({ price: Number(r.price) || 0, condition: String(r.condition ?? '').trim() }))
      .filter((r) => r.condition.length > 0);
  }

  private async getOrThrow(id: number): Promise<RentalPackage> {
    const pkg = await this.packagesRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Package ${id} not found`);
    }
    return pkg;
  }

  // Owner may only touch packages of businesses they own; admin may touch any.
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

  // Best-effort activity log entry, resolving the owner from the businessId
  // when we don't already hold the business.
  private async log(
    ownerIdOrBusinessId: number,
    action: string,
    name: string,
    description: string,
    resolveFromBusiness = false,
  ): Promise<void> {
    let ownerId = ownerIdOrBusinessId;
    if (resolveFromBusiness) {
      const business = await this.businessesRepository.findOne({
        where: { id: ownerIdOrBusinessId },
      });
      if (!business) return;
      ownerId = business.ownerId;
    }
    await this.activity.safeRecord({
      userId: ownerId,
      category: 'product',
      action,
      title: `Package ${action}`,
      description,
      entityName: name,
    });
  }
}
