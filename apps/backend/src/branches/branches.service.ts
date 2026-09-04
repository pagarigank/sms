import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchesRepository: Repository<Branch>,
  ) {}

  findAll(): Promise<Branch[]> {
    return this.branchesRepository.find();
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchesRepository.findOneBy({ id });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const branch = this.branchesRepository.create(createBranchDto);
    return this.branchesRepository.save(branch);
  }

  async remove(id: string): Promise<void> {
    const result = await this.branchesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
  }
}
