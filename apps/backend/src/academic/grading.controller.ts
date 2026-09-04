import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GradingService } from './grading.service';

@ApiTags('grading')
@ApiBearerAuth('access-token')
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  // === Grading Systems ===
  @Get('systems')
  @ApiOperation({ summary: 'List grading systems', description: 'Filtered by education level, school year, or branch.' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'educationLevelId', required: false })
  @ApiQuery({ name: 'schoolYearId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  findGradingSystems(
    @Query('tenantId') tenantId: string,
    @Query('educationLevelId') elId?: string,
    @Query('schoolYearId') syId?: string,
    @Query('branchId') branchId?: string,
  ) { return this.gradingService.findGradingSystems(tenantId, { educationLevelId: elId, schoolYearId: syId, branchId }); }

  @Get('systems/:id')
  @ApiOperation({ summary: 'Get grading system detail' })
  findOneGradingSystem(@Param('id') id: string) { return this.gradingService.findOneGradingSystem(id); }

  @Get('systems/resolve')
  @ApiOperation({
    summary: 'Resolve active grading system',
    description: 'Resolution order: (1) branch-specific active, (2) tenant-default active. Used by gradebook to determine which system applies.',
  })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'educationLevelId', required: true })
  @ApiQuery({ name: 'schoolYearId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'Resolved grading system.' })
  @ApiResponse({ status: 404, description: 'No active grading system found.' })
  resolveGradingSystem(
    @Query('tenantId') tenantId: string,
    @Query('educationLevelId') elId: string,
    @Query('schoolYearId') syId: string,
    @Query('branchId') branchId?: string,
  ) { return this.gradingService.resolveGradingSystem(tenantId, elId, syId, branchId); }

  @Post('systems')
  @ApiOperation({ summary: 'Create grading system', description: 'Types: numeric, descriptive, gpa, pass_fail. Enforces one active per (tenant, level, SY, branch).' })
  @ApiResponse({ status: 201, description: 'Grading system created.' })
  @ApiResponse({ status: 409, description: 'Active grading system already exists for this context.' })
  createGradingSystem(@Body() body: any) { return this.gradingService.createGradingSystem(body); }

  // === Grade Components ===
  @Get('systems/:gradingSystemId/components')
  @ApiOperation({ summary: 'List grade components', description: 'e.g. Written Work, Performance Task, Quarterly Exam' })
  findGradeComponents(@Param('gradingSystemId') gsId: string) { return this.gradingService.findGradeComponents(gsId); }

  @Post('components')
  @ApiOperation({ summary: 'Create grade component', description: 'Weight is percentage (0-100). Components within a system should sum to 100.' })
  createGradeComponent(@Body() body: any) { return this.gradingService.createGradeComponent(body); }

  // === Honor Roll Configs ===
  @Get('honor-roll')
  @ApiOperation({ summary: 'List honor roll configs', description: 'Thresholds for Latin honors per education level per SY.' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'educationLevelId', required: false })
  @ApiQuery({ name: 'schoolYearId', required: false })
  findHonorRollConfigs(
    @Query('tenantId') tenantId: string,
    @Query('educationLevelId') elId?: string,
    @Query('schoolYearId') syId?: string,
  ) { return this.gradingService.findHonorRollConfigs(tenantId, { educationLevelId: elId, schoolYearId: syId }); }

  @Post('honor-roll')
  @ApiOperation({ summary: 'Create honor roll config', description: 'Set thresholds: withHonors, withHighHonors, withHighestHonors.' })
  createHonorRollConfig(@Body() body: any) { return this.gradingService.createHonorRollConfig(body); }
}
