import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehiclesRepository.create(createVehicleDto);
    return this.vehiclesRepository.save(vehicle);
  }

  findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({
      relations: { driver: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: { driver: true, trips: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.preload({
      id,
      ...updateVehicleDto,
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: number): Promise<void> {
    const result = await this.vehiclesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
  }
}
