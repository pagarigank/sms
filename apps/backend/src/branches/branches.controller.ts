import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@ApiTags('branches')
@ApiBearerAuth('access-token')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches', description: 'Returns all branches visible to the authenticated user (tenant-scoped).' })
  @ApiResponse({ status: 200, description: 'List of branches.' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch by ID' })
  @ApiResponse({ status: 200, description: 'Branch found.' })
  @ApiResponse({ status: 404, description: 'Branch not found.' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new branch', description: 'Tenant Admin creates a new campus/branch within their tenant.' })
  @ApiResponse({ status: 201, description: 'Branch created.' })
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }
}
