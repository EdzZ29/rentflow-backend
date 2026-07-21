import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // SSL is required by hosted Postgres like Supabase. Enable with DB_SSL=true.
        const ssl =
          config.get<string>('DB_SSL', 'false') === 'true'
            ? { rejectUnauthorized: false }
            : false;

        // Prefer a single connection string (e.g. Supabase's DATABASE_URL) when
        // provided — switching local → Supabase is then purely env config, no
        // code change. Otherwise fall back to the discrete DB_* fields.
        const url = config.get<string>('DATABASE_URL');

        return {
          type: 'postgres' as const,
          ...(url
            ? { url }
            : {
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 3000),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', 'admin'),
                database: config.get<string>('DB_DATABASE', 'rentflow'),
              }),
          ssl,
          autoLoadEntities: true,
          // Dev convenience: auto-sync schema from entities.
          // Turn OFF in production and use migrations instead.
          synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
          logging: config.get<string>('DB_LOGGING', 'false') === 'true',
        };
      },
    }),
    // Registered here so SeedService can inject the User repository.
    TypeOrmModule.forFeature([User]),
    UsersModule,
  ],
  providers: [SeedService],
})
export class DatabaseModule {}
