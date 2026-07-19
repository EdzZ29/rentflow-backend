import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/entities/business.entity';
import { effectivePlan, isTrialActive } from '../subscription/plan-limits';
import { PlanType, User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessesRepository: Repository<Business>,
  ) {}

  async getStats() {
    const users = await this.usersRepository.find();
    const owners = users.filter((u) => u.role === UserRole.OWNER);
    const businesses = await this.businessesRepository.count();

    return {
      users: {
        total: users.length,
        admins: users.filter((u) => u.role === UserRole.ADMIN).length,
        owners: owners.length,
        customers: users.filter((u) => u.role === UserRole.CUSTOMER).length,
        active: users.filter((u) => u.isActive).length,
      },
      businesses,
      subscriptions: {
        trialing: owners.filter((o) => isTrialActive(o)).length,
        monthly: owners.filter((o) => o.plan === PlanType.MONTHLY).length,
        yearly: owners.filter((o) => o.plan === PlanType.YEARLY).length,
        inactive: owners.filter((o) => effectivePlan(o) === PlanType.NONE)
          .length,
      },
      system: {
        service: 'rentflow-api',
        environment: process.env.NODE_ENV ?? 'development',
        nodeVersion: process.version,
        database: 'PostgreSQL',
        dbConnected: true,
        uptimeSeconds: Math.round(process.uptime()),
      },
      security: [
        { label: 'JWT authentication', status: 'Enabled', ok: true },
        { label: 'Role-based access control', status: 'Enabled', ok: true },
        { label: 'Password hashing (bcrypt)', status: 'Enabled', ok: true },
        { label: 'Request validation', status: 'Enabled', ok: true },
        { label: 'CORS policy', status: 'Configured', ok: true },
        {
          label: 'HTTPS / TLS',
          status: 'Required in production',
          ok: false,
        },
      ],
    };
  }
}
