import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { businessLimitFor, effectivePlan } from '../subscription/plan-limits';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { Business, BusinessStatus } from './entities/business.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessesRepository: Repository<Business>,
    private readonly usersService: UsersService,
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
    return this.businessesRepository.save(business);
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
    return this.businessesRepository.save(business!);
  }

  async remove(id: number, actor: AuthUser): Promise<void> {
    await this.findOne(id, actor);
    await this.businessesRepository.delete(id);
  }

  async setImage(id: number, imageUrl: string, actor: AuthUser) {
    await this.findOne(id, actor); // enforces ownership
    await this.businessesRepository.update(id, { imageUrl });
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
      .where('b.status = :status', { status: BusinessStatus.ACTIVE });

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
    return rows.map((b) => this.toPublic(b));
  }

  async findPublicOne(id: number) {
    const business = await this.businessesRepository.findOne({
      where: { id, status: BusinessStatus.ACTIVE },
      relations: { owner: true },
    });
    if (!business) {
      throw new NotFoundException('Rental not found');
    }
    return this.toPublic(business);
  }

  /** Only expose safe, non-sensitive fields to the public. */
  private toPublic(b: Business) {
    return {
      id: b.id,
      name: b.name,
      category: b.category,
      description: b.description,
      location: b.location,
      imageUrl: b.imageUrl,
      ownerName: b.owner?.fullName ?? null,
      createdAt: b.createdAt,
    };
  }
}
