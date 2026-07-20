import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessPlan } from '../businesses/entities/business.entity';
import { Product } from '../products/entities/product.entity';
import { effectivePlan, isTrialActive } from '../subscription/plan-limits';
import { PlanType, User, UserRole } from '../users/entities/user.entity';

// Estimated monthly value of each owner-level billing plan (USD).
const PLAN_MRR: Record<string, number> = {
  [PlanType.MONTHLY]: 29,
  [PlanType.YEARLY]: 290 / 12,
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessesRepository: Repository<Business>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async getStats() {
    const users = await this.usersRepository.find();
    const owners = users.filter((u) => u.role === UserRole.OWNER);
    const businessList = await this.businessesRepository.find();
    const businesses = businessList.length;

    const marketplaceCount = businessList.filter(
      (b) => b.subscriptionType === BusinessPlan.MARKETPLACE,
    ).length;
    const publishedProducts = await this.productsRepository.count({
      where: { isPublished: true },
    });
    const estimatedMrr = owners.reduce(
      (sum, o) => sum + (PLAN_MRR[effectivePlan(o)] ?? 0),
      0,
    );

    return {
      marketplace: {
        marketplace: marketplaceCount,
        business: businesses - marketplaceCount,
        publishedProducts,
      },
      revenue: {
        estimatedMrr: Math.round(estimatedMrr),
        estimatedArr: Math.round(estimatedMrr * 12),
      },
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
