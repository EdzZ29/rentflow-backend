import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './entities/driver.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driversRepository: Repository<Driver>,
  ) {}

  create(createDriverDto: CreateDriverDto): Promise<Driver> {
    const driver = this.driversRepository.create(createDriverDto);
    return this.driversRepository.save(driver);
  }

  findAll(): Promise<Driver[]> {
    return this.driversRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Driver> {
    const driver = await this.driversRepository.findOne({
      where: { id },
      relations: { vehicles: true, trips: true },
    });
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
  }

  async update(id: number, updateDriverDto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.driversRepository.preload({
      id,
      ...updateDriverDto,
    });
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return this.driversRepository.save(driver);
  }

  async remove(id: number): Promise<void> {
    const result = await this.driversRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
  }
}
