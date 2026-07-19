import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
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

    const { password, ...rest } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ ...rest, passwordHash });

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

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }
}
