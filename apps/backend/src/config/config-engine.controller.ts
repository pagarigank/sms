import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigEngineService } from './config-engine.service';

@ApiTags('config')
@ApiBearerAuth('access-token')
@Controller('config')
export class ConfigEngineController {
  constructor(private readonly configService: ConfigEngineService) {}

  @Get('lookup-lists')
  @ApiOperation({ summary: 'List lookup lists', description: 'Returns all configurable reference data lists for a tenant.' })
  @ApiQuery({ name: 'tenantId', required: true, description: 'Tenant UUID' })
  @ApiResponse({ status: 200, description: 'List of lookup lists.' })
  findLookupLists(@Query('tenantId') tenantId: string) {
    return this.configService.findLookupLists(tenantId);
  }

  @Post('lookup-lists')
  @ApiOperation({ summary: 'Create a lookup list', description: 'Create a new configurable reference data list (e.g. Room Types, Document Types).' })
  @ApiResponse({ status: 201, description: 'Lookup list created.' })
  createLookupList(@Body() body: any) {
    return this.configService.createLookupList(body);
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

  @Get('custom-fields')
  @ApiOperation({ summary: 'List custom field definitions', description: 'Returns custom field definitions for a given entity type (student, employee, enrollment, invoice).' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'entityType', required: true, enum: ['student', 'employee', 'applicant', 'guardian', 'enrollment', 'invoice'] })
  @ApiResponse({ status: 200, description: 'List of custom field definitions.' })
  findCustomFields(@Query('tenantId') tenantId: string, @Query('entityType') entityType: string) {
    return this.configService.findCustomFields(tenantId, entityType);
  }

  @Post('custom-fields')
  @ApiOperation({ summary: 'Create a custom field definition', description: 'Add a custom field to an entity type without schema migration (EAV pattern).' })
  @ApiResponse({ status: 201, description: 'Custom field created.' })
  createCustomField(@Body() body: any) {
    return this.configService.createCustomField(body);
  }

  @Get('audit-events')
  @ApiOperation({ summary: 'List audit events', description: 'Returns recent audit events for compliance review (last 100).' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiResponse({ status: 200, description: 'List of audit events.' })
  findAuditEvents(@Query('tenantId') tenantId: string, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.configService.findAuditEvents(tenantId, { entityType, entityId });
  }
}
