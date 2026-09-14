import { Controller, Get, Post, Put, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';

@ApiTags('communications')
@ApiBearerAuth('access-token')
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly commsService: CommunicationsService) {}

  // === Templates ===
  @Get('templates')
  @ApiOperation({ summary: 'List notification templates' })
  async getTemplates(
    @Headers('x-tenant-id') tenantId: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.commsService.getTemplates(tenantId, eventType);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  async createTemplate(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.commsService.createTemplate({ ...body, tenantId });
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update notification template' })
  async updateTemplate(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.commsService.updateTemplate(id, tenantId, body);
  }

  // === Rules ===
  @Get('rules')
  @ApiOperation({ summary: 'List notification rules' })
  async getRules(@Headers('x-tenant-id') tenantId: string) {
    return this.commsService.getRules(tenantId);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create notification rule' })
  async createRule(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.commsService.createRule({ ...body, tenantId });
  }

  // === Channel Configs ===
  @Get('channels')
  @ApiOperation({ summary: 'List channel configurations' })
  async getChannels(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.commsService.getChannelConfigs(tenantId, branchId);
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create channel configuration' })
  async createChannel(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.commsService.createChannelConfig({ ...body, tenantId });
  }

  // === Dispatch ===
  @Post('dispatch')
  @ApiOperation({ summary: 'Dispatch notification (stub — queues for provider)' })
  async dispatch(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.commsService.dispatch({ ...body, tenantId });
  }

  @Get('logs')
  @ApiOperation({ summary: 'List notification logs' })
  async getLogs(
    @Headers('x-tenant-id') tenantId: string,
    @Query('recipientUserId') recipientUserId?: string,
    @Query('status') status?: string,
  ) {
    return this.commsService.getNotificationLogs(tenantId, { recipientUserId, status });
  }

  // === Announcements ===
  @Get('announcements')
  @ApiOperation({ summary: 'List announcements' })
  async getAnnouncements(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.commsService.getAnnouncements(tenantId, branchId);
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  async createAnnouncement(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.commsService.createAnnouncement({ ...body, tenantId });
  }

  @Put('announcements/:id/publish')
  @ApiOperation({ summary: 'Publish announcement' })
  async publishAnnouncement(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.commsService.publishAnnouncement(id, tenantId);
  }

  // === Messages ===
  @Get('threads')
  @ApiOperation({ summary: 'List message threads' })
  async getThreads(
    @Headers('x-tenant-id') tenantId: string,
    @Query('userId') userId: string,
  ) {
    return this.commsService.getThreads(tenantId, userId);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create message thread' })
  async createThread(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.commsService.createThread({ ...body, tenantId });
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get thread messages' })
  async getMessages(
    @Param('threadId') threadId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.commsService.getThreadMessages(threadId, tenantId);
  }

  @Post('threads/:threadId/messages')
  @ApiOperation({ summary: 'Send message in thread' })
  async sendMessage(
    @Param('threadId') threadId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.commsService.sendMessage({ ...body, threadId, tenantId });
  }

  @Put('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markRead(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.commsService.markRead(id, tenantId);
  }
}
