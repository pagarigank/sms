import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigEngineService } from './config-engine.service';
import { NumberingScheme } from './numbering-scheme.entity';
import { FeatureFlag } from './feature-flag.entity';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowInstance } from './workflow-instance.entity';

@ApiTags('config')
@ApiBearerAuth('every controller in this module uses the x-tenant-id header pattern')
@Controller('config')
export class ConfigEngineController {
  constructor(private readonly configService: ConfigEngineService) {}

  // --- Lookup Lists ---
  @Get('lookup-lists')
  @ApiOperation({ summary: 'List lookup lists', description: 'Returns all configurable reference data lists for a tenant.' })
  @ApiResponse({ status: 200, description: 'List of lookup lists.' })
  findLookupLists(@Headers('x-tenant-id') tenantId: string) {
    return this.configService.findLookupLists(tenantId);
  }

  @Post('lookup-lists')
  @ApiOperation({ summary: 'Create a lookup list', description: 'Create a new configurable reference data list (e.g. Room Types, Document Types).' })
  @ApiResponse({ status: 201, description: 'Lookup list created.' })
  createLookupList(@Body() body: any, @Headers('x-tenant-id') tenantId: string) {
    return this.configService.createLookupList({ ...body, tenantId });
  }

  // NOTE: literal routes must be declared before parameterized ones — NestJS
  // matches routes in declaration order, so `lookup-lists/items` and
  // `lookup-lists/:id` would otherwise be captured by `:id`.
  @Get('lookup-lists/items')
  @ApiOperation({ summary: 'List lookup items (optionally filtered by list)', description: 'Flat item listing across lists; filter by lookupListId.' })
  @ApiQuery({ name: 'lookupListId', required: false })
  findLookupItemsFlat(@Headers('x-tenant-id') tenantId: string, @Query('lookupListId') listId?: string) {
    return this.configService.findLookupItemsFlat(tenantId, listId);
  }

  @Get('lookup-lists/:id')
  @ApiOperation({ summary: 'Get lookup list detail' })
  findOneLookupList(@Param('id') id: string) {
    return this.configService.findOneLookupList(id);
  }

  @Put('lookup-lists/:id')
  @ApiOperation({ summary: 'Update a lookup list' })
  updateLookupList(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateLookupList(id, body);
  }

  @Delete('lookup-lists/:id')
  @ApiOperation({ summary: 'Delete a lookup list', description: 'Fails with 409 if items exist or the list is referenced.' })
  removeLookupList(@Param('id') id: string) {
    return this.configService.removeLookupList(id);
  }

  @Get('lookup-lists/:listId/items')
  @ApiOperation({ summary: 'List items in a lookup list', description: 'Returns all items for a specific lookup list, sorted by sortOrder.' })
  @ApiResponse({ status: 200, description: 'List of lookup items.' })
  findLookupItems(@Param('listId') listId: string) {
    return this.configService.findLookupItems(listId);
  }

  @Post('lookup-items')
  @ApiOperation({ summary: 'Create a lookup item', description: 'Add a new value to an existing lookup list.' })
  @ApiResponse({ status: 201, description: 'Lookup item created.' })
  createLookupItem(@Body() body: any) {
    return this.configService.createLookupItem(body);
  }

  @Put('lookup-items/:id')
  @ApiOperation({ summary: 'Update a lookup item' })
  updateLookupItem(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateLookupItem(id, body);
  }

  @Delete('lookup-items/:id')
  @ApiOperation({ summary: 'Delete a lookup item' })
  removeLookupItem(@Param('id') id: string) {
    return this.configService.removeLookupItem(id);
  }

  // --- Custom Fields ---
  @Get('custom-fields')
  @ApiOperation({ summary: 'List custom field definitions', description: 'Returns custom field definitions for a given entity type (student, employee, enrollment, invoice).' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['student', 'employee', 'applicant', 'guardian', 'enrollment', 'invoice'] })
  @ApiResponse({ status: 200, description: 'List of custom field definitions.' })
  findCustomFields(@Headers('x-tenant-id') tenantId: string, @Query('entityType') entityType?: string) {
    return this.configService.findCustomFields(tenantId, entityType);
  }

  @Get('custom-fields/:id')
  @ApiOperation({ summary: 'Get custom field definition detail' })
  findOneCustomField(@Param('id') id: string) {
    return this.configService.findOneCustomField(id);
  }

  @Post('custom-fields')
  @ApiOperation({ summary: 'Create a custom field definition', description: 'Add a custom field to an entity type without schema migration (EAV pattern).' })
  @ApiResponse({ status: 201, description: 'Custom field created.' })
  createCustomField(@Body() body: any, @Headers('x-tenant-id') tenantId: string) {
    return this.configService.createCustomField({ ...body, tenantId });
  }

  @Put('custom-fields/:id')
  @ApiOperation({ summary: 'Update a custom field definition' })
  updateCustomField(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateCustomField(id, body);
  }

  @Delete('custom-fields/:id')
  @ApiOperation({ summary: 'Delete a custom field definition' })
  removeCustomField(@Param('id') id: string) {
    return this.configService.removeCustomField(id);
  }

  // --- Numbering Schemes ---
  @Get('numbering-schemes')
  @ApiOperation({ summary: 'List numbering schemes', description: 'Prefix/counter/padding rules per entity (invoice no., student no., OR series…).' })
  findNumberingSchemes(@Headers('x-tenant-id') tenantId: string) {
    return this.configService.findNumberingSchemes(tenantId);
  }

  @Post('numbering-schemes')
  @ApiOperation({ summary: 'Create a numbering scheme' })
  createNumberingScheme(@Body() body: any, @Headers('x-tenant-id') tenantId: string) {
    return this.configService.createNumberingScheme({ ...body, tenantId });
  }

  @Put('numbering-schemes/:id')
  @ApiOperation({ summary: 'Update a numbering scheme' })
  updateNumberingScheme(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateNumberingScheme(id, body);
  }

  // --- Feature Flags ---
  @Get('feature-flags')
  @ApiOperation({ summary: 'List feature flags', description: 'Per-tenant/branch module and rollout toggles.' })
  findFeatureFlags(@Headers('x-tenant-id') tenantId: string) {
    return this.configService.findFeatureFlags(tenantId);
  }

  @Post('feature-flags')
  @ApiOperation({ summary: 'Create a feature flag' })
  createFeatureFlag(@Body() body: any, @Headers('x-tenant-id') tenantId: string) {
    return this.configService.createFeatureFlag({ ...body, tenantId });
  }

  @Put('feature-flags/:id')
  @ApiOperation({ summary: 'Update a feature flag' })
  updateFeatureFlag(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateFeatureFlag(id, body);
  }

  @Delete('feature-flags/:id')
  @ApiOperation({ summary: 'Delete a feature flag' })
  removeFeatureFlag(@Param('id') id: string) {
    return this.configService.removeFeatureFlag(id);
  }

  // --- Workflows ---
  @Get('workflows')
  @ApiOperation({ summary: 'List workflow definitions', description: 'Approval-chain definitions (grade change, discount, refund, document release).' })
  findWorkflows(@Headers('x-tenant-id') tenantId: string) {
    return this.configService.findWorkflows(tenantId);
  }

  @Post('workflows')
  @ApiOperation({ summary: 'Create a workflow definition' })
  createWorkflow(@Body() body: any, @Headers('x-tenant-id') tenantId: string) {
    return this.configService.createWorkflow({ ...body, tenantId });
  }

  @Put('workflows/:id')
  @ApiOperation({ summary: 'Update a workflow definition' })
  updateWorkflow(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateWorkflow(id, body);
  }

  @Get('workflow-instances')
  @ApiOperation({ summary: 'List workflow instances', description: 'Running approval instances for the tenant.' })
  findWorkflowInstances(@Headers('x-tenant-id') tenantId: string) {
    return this.configService.findWorkflowInstances(tenantId);
  }

  // --- Audit Log ---
  @Get('audit-events')
  @ApiOperation({ summary: 'List audit events', description: 'Returns recent audit events for compliance review (last 100).' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiResponse({ status: 200, description: 'List of audit events.' })
  findAuditEvents(
    @Headers('x-tenant-id') tenantId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.configService.findAuditEvents(tenantId, { entityType, entityId });
  }

  @Get('audit-events/:id')
  @ApiOperation({ summary: 'Get audit event detail' })
  findOneAuditEvent(@Param('id') id: string) {
    return this.configService.findOneAuditEvent(id);
  }
}
