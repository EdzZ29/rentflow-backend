import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip } from './entities/trip.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripsRepository: Repository<Trip>,
  ) {}

  create(createTripDto: CreateTripDto): Promise<Trip> {
    const trip = this.tripsRepository.create(this.normalize(createTripDto));
    return this.tripsRepository.save(trip);
  }

  findAll(): Promise<Trip[]> {
    return this.tripsRepository.find({
      relations: { vehicle: true, driver: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Trip> {
    const trip = await this.tripsRepository.findOne({
      where: { id },
      relations: { vehicle: true, driver: true },
    });
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    return trip;
  }

  async update(id: number, updateTripDto: UpdateTripDto): Promise<Trip> {
    const trip = await this.tripsRepository.preload({
      id,
      ...this.normalize(updateTripDto),
    });
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    return this.tripsRepository.save(trip);
  }

  async remove(id: number): Promise<void> {
    const result = await this.tripsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
  }

  /** Convert ISO date strings from DTOs into Date objects for persistence. */
  private normalize<T extends Partial<CreateTripDto>>(dto: T) {
    return {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
      completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
    };
  }
}
