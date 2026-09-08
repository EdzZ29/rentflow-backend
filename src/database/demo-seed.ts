/**
 * Demo marketplace data, for local development.
 *
 * The public storefront (and therefore the mobile app) only shows a product
 * when ALL of these hold:
 *   business.status           === 'active'
 *   business.subscriptionType === 'marketplace'
 *   product.isPublished       === true
 * A fresh database has none of that, so every listing screen is empty.
 * This fills in a realistic set so the storefront has something to show.
 *
 *   npm run seed:demo          seed (idempotent — safe to re-run)
 *   npm run seed:demo -- --undo   remove everything it created
 *
 * Everything hangs off one owner account, and the foreign keys cascade, so
 * removal is a single delete of that user.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import {
  Business,
  BusinessPlan,
  BusinessStatus,
} from '../businesses/entities/business.entity';
import {
  PackageAvailability,
  PackagePriceUnit,
  RentalPackage,
} from '../packages/entities/package.entity';
import { Product, ProductAvailability } from '../products/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

// The marker for everything this script owns. Deleting this user cascades to
// its businesses, and those cascade to their products and packages.
const DEMO_EMAIL = 'demo-owner@rentivo.local';
const DEMO_PASSWORD = 'demo1234';

interface SeedProduct {
  name: string;
  description: string;
  pricePerDay: number;
  availability?: ProductAvailability;
}

interface SeedBusiness {
  name: string;
  category: string;
  description: string;
  location: string;
  phone: string;
  products: SeedProduct[];
  packages: {
    name: string;
    description: string;
    price: number;
    priceUnit: PackagePriceUnit;
    items: string[];
    itemValues: { label: string; value: number }[];
  }[];
}

const BUSINESSES: SeedBusiness[] = [
  {
    name: 'Northwind Car Rentals',
    category: 'Vehicles',
    description:
      'Self-drive and chauffeur-driven vehicles for city trips, provincial drives and airport transfers.',
    location: 'Makati, Metro Manila',
    phone: '+63 917 555 0142',
    products: [
      {
        name: 'Toyota Vios 2022 (Self-drive)',
        description: 'Fuel-efficient sedan, seats 5. Automatic transmission.',
        pricePerDay: 2200,
      },
      {
        name: 'Toyota Hiace Commuter',
        description: '15-seater van, ideal for group trips and airport runs.',
        pricePerDay: 4800,
      },
      {
        name: 'Honda Click 125i Scooter',
        description: 'Easy city scooter with helmet and raincoat included.',
        pricePerDay: 650,
      },
      {
        name: 'Ford Everest 4x4',
        description: 'Seven-seater SUV built for long provincial drives.',
        pricePerDay: 5600,
        availability: ProductAvailability.UNAVAILABLE,
      },
    ],
    packages: [
      {
        name: 'Airport Transfer Bundle',
        description: 'Van, driver and fuel for a round-trip airport transfer.',
        price: 6500,
        priceUnit: PackagePriceUnit.PACKAGE,
        items: ['Hiace van (10 hrs)', 'Professional driver', 'Fuel allowance', 'Toll fees'],
        itemValues: [
          { label: 'Hiace van (10 hrs)', value: 4800 },
          { label: 'Professional driver', value: 1800 },
          { label: 'Fuel allowance', value: 1200 },
          { label: 'Toll fees', value: 500 },
        ],
      },
    ],
  },
  {
    name: 'Lumina Events & Party',
    category: 'Events & Party',
    description:
      'Complete party setups — tables, chairs, lights and styling for weddings, birthdays and corporate events.',
    location: 'Cebu City, Cebu',
    phone: '+63 918 555 0177',
    products: [
      {
        name: 'Round Banquet Table (10-seater)',
        description: 'Includes white linen cover and skirting.',
        pricePerDay: 350,
      },
      {
        name: 'Tiffany Chair (set of 10)',
        description: 'Gold tiffany chairs with cushions.',
        pricePerDay: 900,
      },
      {
        name: 'LED Uplight Set (8 pcs)',
        description: 'Colour-changing wireless uplights with remote.',
        pricePerDay: 2400,
      },
    ],
    packages: [
      {
        name: 'Intimate Wedding Setup (50 pax)',
        description: 'Tables, chairs, styling and lighting for a 50-guest reception.',
        price: 28000,
        priceUnit: PackagePriceUnit.PACKAGE,
        items: [
          '5 round banquet tables',
          '50 tiffany chairs',
          'Bridal table styling',
          'LED uplighting (8 pcs)',
          'On-site setup crew',
        ],
        itemValues: [
          { label: '5 round banquet tables', value: 1750 },
          { label: '50 tiffany chairs', value: 4500 },
          { label: 'Bridal table styling', value: 12000 },
          { label: 'LED uplighting (8 pcs)', value: 2400 },
          { label: 'On-site setup crew', value: 9000 },
        ],
      },
      {
        name: 'Birthday Basics',
        description: 'A simple, well-styled setup for a 30-guest birthday party.',
        price: 12500,
        priceUnit: PackagePriceUnit.PACKAGE,
        items: ['3 banquet tables', '30 chairs', 'Balloon backdrop', 'Basic lighting'],
        itemValues: [
          { label: '3 banquet tables', value: 1050 },
          { label: '30 chairs', value: 2700 },
          { label: 'Balloon backdrop', value: 6500 },
          { label: 'Basic lighting', value: 3200 },
        ],
      },
    ],
  },
  {
    name: 'Frame & Focus Camera Rental',
    category: 'Photography',
    description:
      'Bodies, lenses and lighting for shoots of every size. Insured gear, same-day pickup.',
    location: 'Quezon City, Metro Manila',
    phone: '+63 919 555 0163',
    products: [
      {
        name: 'Sony A7 IV Body',
        description: '33MP full-frame mirrorless. Two batteries and a 128GB card included.',
        pricePerDay: 2800,
      },
      {
        name: 'Canon RF 24-70mm f/2.8L',
        description: 'Workhorse zoom for events and portraits.',
        pricePerDay: 1900,
      },
      {
        name: 'Godox AD600 Pro Strobe',
        description: '600Ws battery strobe with reflector and stand.',
        pricePerDay: 1500,
      },
      {
        name: 'DJI RS 4 Gimbal',
        description: 'Three-axis stabiliser for mirrorless rigs.',
        pricePerDay: 1200,
      },
    ],
    packages: [],
  },
];

async function main() {
  const undo = process.argv.includes('--undo');
  const logger = new Logger('DemoSeed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const businesses = app.get<Repository<Business>>(getRepositoryToken(Business));
    const products = app.get<Repository<Product>>(getRepositoryToken(Product));
    const packages = app.get<Repository<RentalPackage>>(getRepositoryToken(RentalPackage));
    const usersService = app.get(UsersService);

    const existing = await users.findOne({ where: { email: DEMO_EMAIL } });

    if (undo) {
      if (!existing) {
        logger.log('Nothing to remove — no demo owner found.');
        return;
      }
      // Businesses cascade from the user, products and packages from the
      // business, so this one delete takes the whole tree with it.
      await users.delete({ id: existing.id });
      logger.log(`Removed the demo owner (${DEMO_EMAIL}) and everything it owned.`);
      return;
    }

    // Re-running should refresh the data, not pile up duplicates.
    if (existing) {
      await users.delete({ id: existing.id });
      logger.log('Existing demo data found — replacing it.');
    }

    const owner = await usersService.create({
      fullName: 'Demo Owner',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      role: UserRole.OWNER,
    });

    let productCount = 0;
    let packageCount = 0;

    for (const seed of BUSINESSES) {
      // status ACTIVE + plan MARKETPLACE are what make a business public.
      const business = await businesses.save(
        businesses.create({
          name: seed.name,
          category: seed.category,
          description: seed.description,
          location: seed.location,
          phone: seed.phone,
          status: BusinessStatus.ACTIVE,
          subscriptionType: BusinessPlan.MARKETPLACE,
          ownerId: owner.id,
        }),
      );

      for (const p of seed.products) {
        await products.save(
          products.create({
            name: p.name,
            description: p.description,
            pricePerDay: p.pricePerDay,
            currency: 'PHP',
            availability: p.availability ?? ProductAvailability.AVAILABLE,
            isPublished: true,
            rentalRules: 'Valid government ID required. Return with the same fuel level.',
            cancellationPolicy: 'Free cancellation up to 48 hours before pickup.',
            businessId: business.id,
          }),
        );
        productCount += 1;
      }

      for (const pkg of seed.packages) {
        await packages.save(
          packages.create({
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            currency: 'PHP',
            priceUnit: pkg.priceUnit,
            items: pkg.items,
            itemValues: pkg.itemValues,
            options: [],
            tiers: [],
            availability: PackageAvailability.AVAILABLE,
            isPublished: true,
            businessId: business.id,
          }),
        );
        packageCount += 1;
      }
    }

    logger.log(
      `Seeded ${BUSINESSES.length} marketplace businesses, ${productCount} products, ` +
        `${packageCount} packages. Owner login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
