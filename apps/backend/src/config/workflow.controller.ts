import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Workflow Engine')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/workflow')
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'List workflow definitions', description: 'Get all active workflow definitions for the tenant' })
  @ApiResponse({ status: 200, description: 'List of workflow definitions' })
  async getDefinitions(@Request() req: any) {
    return this.workflowService.getDefinitions(req.user.tenantId);
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create workflow definition', description: 'Create a new approval workflow definition' })
  @ApiBody({ schema: { properties: { entityType: { type: 'string' }, name: { type: 'string' }, steps: { type: 'array' }, slaHours: { type: 'number' } } } })
  async createDefinition(@Request() req: any, @Body() body: any) {
    return this.workflowService.createDefinition({
      ...body,
      tenantId: req.user.tenantId,
    });
  }

  @Post('start')
  @ApiOperation({ summary: 'Start workflow', description: 'Start a new workflow instance for an entity' })
  @ApiBody({ schema: { properties: { entityType: { type: 'string' }, entityId: { type: 'string' }, reason: { type: 'string' } } } })
  async startWorkflow(@Request() req: any, @Body() body: any) {
    return this.workflowService.startWorkflow(
      req.user.tenantId,
      body.entityType,
      body.entityId,
      req.user.id,
      body.reason,
    );
  }

  @Post(':id/decide')
  @ApiOperation({ summary: 'Decide on workflow', description: 'Approve or reject a workflow instance' })
  @ApiBody({ schema: { properties: { decision: { type: 'string', enum: ['approved', 'rejected'] }, reason: { type: 'string' } } } })
  async decide(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.workflowService.decide(id, req.user.id, body.decision, body.reason);
  }

  @Get('pending')
  @ApiOperation({ summary: 'List pending workflows', description: 'Get all pending workflows for the tenant' })
  async getPending(@Request() req: any) {
    return this.workflowService.getPendingWorkflows(req.user.tenantId);
  }
}
