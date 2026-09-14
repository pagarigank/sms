import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  findAllFiltered(tenantId?: string, branchId?: string): Promise<Department[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (branchId) where.branchId = branchId;
    return this.departmentsRepository.find({ where, relations: ['branch'] });
  }

  findAll(): Promise<Department[]> {
    return this.departmentsRepository.find({ relations: ['branch'] });
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.departmentsRepository.findOne({ where: { id }, relations: ['branch'] });
    if (!dept) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return dept;
  }

  create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const dept = this.departmentsRepository.create(createDepartmentDto);
    return this.departmentsRepository.save(dept);
  }

  async update(id: string, data: Partial<CreateDepartmentDto>): Promise<Department> {
    const dept = await this.departmentsRepository.findOneBy({ id });
    if (!dept) throw new NotFoundException(`Department with ID ${id} not found`);
    Object.assign(dept, data);
    return this.departmentsRepository.save(dept);
  }

  async setDefault(id: string): Promise<Department> {
    const dept = await this.departmentsRepository.findOne({ where: { id }, relations: ['branch'] });
    if (!dept) throw new NotFoundException(`Department with ID ${id} not found`);
    // Clear default flag on all departments in the same branch
    await this.departmentsRepository.update({ branchId: dept.branchId }, { isDefault: false });
    dept.isDefault = true;
    return this.departmentsRepository.save(dept);
  }

  async remove(id: string): Promise<void> {
    const result = await this.departmentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
  }
}
