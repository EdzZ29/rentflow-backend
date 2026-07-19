import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

/**
 * Creates a default Admin account on first boot so the admin-only /users
 * surface is reachable. Credentials come from env; override them in prod.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.usersRepository.count();
    if (count > 0) {
      return;
    }

    const email = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@rentflow.local',
    );
    const password = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'admin1234',
    );

    await this.usersService.create({
      fullName: 'RentFlow Admin',
      email,
      password,
      role: UserRole.ADMIN,
    });

    this.logger.log(`Seeded default admin account: ${email}`);
  }
}
