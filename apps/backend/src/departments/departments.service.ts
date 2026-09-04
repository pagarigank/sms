import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  findAll(): Promise<Department[]> {
    return this.departmentsRepository.find();
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.departmentsRepository.findOneBy({ id });
    if (!dept) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return dept;
  }

  create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const dept = this.departmentsRepository.create(createDepartmentDto);
    return this.departmentsRepository.save(dept);
  }

  async remove(id: string): Promise<void> {
    const result = await this.departmentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
  }
}
