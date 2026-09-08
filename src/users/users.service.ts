import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LEGAL_VERSION } from '../legal/legal.content';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { PLAN_DURATION_DAYS } from '../subscription/plan-limits';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PlanType, User, UserRole } from './entities/user.entity';

const TRIAL_DAYS = 7;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Creates a user.
   * @param actorRole role of the user performing the action. When it is OWNER,
   *   only Customer accounts may be created (no privilege escalation). When
   *   omitted (internal/self-registration), no role restriction is applied.
   */
  async create(
    createUserDto: CreateUserDto,
    actorRole?: UserRole,
  ): Promise<User> {
    if (
      actorRole === UserRole.OWNER &&
      createUserDto.role &&
      createUserDto.role !== UserRole.CUSTOMER
    ) {
      throw new ForbiddenException('Owners may only create customer accounts');
    }

    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const { password, acceptedTerms, ...rest } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ ...rest, passwordHash });

    // Record which revision was agreed to, not just that something was.
    if (acceptedTerms) {
      user.termsAcceptedAt = new Date();
      user.termsVersion = LEGAL_VERSION;
    }

    // New owners start on a 7-day free trial automatically.
    if (user.role === UserRole.OWNER) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
      user.plan = PlanType.TRIAL;
      user.trialEndsAt = trialEnds;
    }

    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  /** Look up a user by email (no passwordHash). */
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Resolve a customer by email, creating a lightweight account if none exists
   * (used when an owner books on behalf of a walk-in customer). The generated
   * password is random; the customer can set a real one via "forgot password".
   */
  async findOrCreateCustomer(fullName: string, email: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) return existing;
    return this.create({
      fullName,
      email,
      password: randomBytes(24).toString('hex'),
      role: UserRole.CUSTOMER,
    });
  }

  /** Includes the passwordHash column — used only by the auth layer. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const { password, ...rest } = updateUserDto;
    const patch: Partial<User> = { ...rest };
    if (password) {
      patch.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await this.usersRepository.preload({ id, ...patch });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.usersRepository.save(user);
  }

  /**
   * Self-service profile update. Guards email uniqueness before delegating to
   * update() (which handles password hashing). Only name/email/password are
   * accepted — the caller passes an already-narrowed DTO.
   */
  async updateProfile(
    id: number,
    dto: { fullName?: string; email?: string; password?: string },
  ): Promise<User> {
    if (dto.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('That email is already in use');
      }
    }
    return this.update(id, dto);
  }

  /**
   * Admin override of an owner's plan. Sets the accompanying dates so the
   * existing plan helpers (effectivePlan / planDaysLeft) stay correct — a plan
   * written without them would either never expire or look already lapsed.
   */
  async setPlan(id: number, plan: PlanType): Promise<User> {
    const user = await this.findOne(id);
    const now = new Date();

    user.plan = plan;

    if (plan === PlanType.NONE) {
      // Downgrade: clear every dated field so nothing keeps the plan alive.
      user.planStartedAt = null;
      user.planEndsAt = null;
      user.trialEndsAt = null;
    } else if (plan === PlanType.TRIAL) {
      const trialEnds = new Date(now);
      trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
      user.trialEndsAt = trialEnds;
      user.planStartedAt = now;
      user.planEndsAt = null;
    } else {
      const days = PLAN_DURATION_DAYS[plan] ?? 30;
      const ends = new Date(now);
      ends.setDate(ends.getDate() + days);
      user.planStartedAt = now;
      user.planEndsAt = ends;
      user.trialEndsAt = null;
    }

    return this.usersRepository.save(user);
  }

  async setAvatar(id: number, avatarUrl: string): Promise<User> {
    await this.usersRepository.update(id, { avatarUrl });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }
}
