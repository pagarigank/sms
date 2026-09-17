import { Controller, Get, Post, Put, Patch, Body, Param, Query, Headers, Req } from '@nestjs/common';
import { GradingService } from './grading.service';

@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  private getTenantId(headers: any): string {
    return headers['x-tenant-id'];
  }

  // ============================
  // Grading Systems
  // ============================
  @Get('systems')
  listGradingSystems(@Headers() headers, @Query() query) {
    return this.gradingService.listGradingSystems(this.getTenantId(headers), query);
  }

  @Get('systems/resolve')
  resolveGradingSystem(@Headers() headers, @Query() query) {
    return this.gradingService.resolveGradingSystem(this.getTenantId(headers), query);
  }

  @Post('systems')
  createGradingSystem(@Headers() headers, @Body() body) {
    return this.gradingService.createGradingSystem(this.getTenantId(headers), body);
  }

  @Patch('systems/:id')
  updateGradingSystem(@Headers() headers, @Param('id') id: string, @Body() body) {
    return this.gradingService.updateGradingSystem(this.getTenantId(headers), id, body);
  }

  /** Returns DepEd standard grading system presets (DO 015 s.2026). */
  @Get('presets')
  getPresets(@Query('tier') tier?: string) {
    return this.gradingService.getPresets(tier);
  }

  /**
   * Seeds a DepEd preset grading system for a given education level and school year.
   * Creates the GradingSystem + all GradeComponent rows in one call.
   */
  @Post('systems/seed-deped')
  seedDepEdSystem(
    @Headers() headers,
    @Body() body: { tier: string; educationLevelId: string; schoolYearId: string; branchId?: string },
  ) {
    return this.gradingService.seedDepEdSystem(
      this.getTenantId(headers),
      body.tier as any,
      body.educationLevelId,
      body.schoolYearId,
      body.branchId,
    );
  }

  // ============================
  // Grade Components
  // ============================
  @Get('systems/:systemId/components')
  listComponents(@Headers() headers, @Param('systemId') systemId: string) {
    return this.gradingService.listComponents(this.getTenantId(headers), systemId);
  }

  @Post('components')
  createComponent(@Headers() headers, @Body() body) {
    return this.gradingService.createComponent(this.getTenantId(headers), body);
  }

  // ============================
  // Grade Entries
  // ============================
  @Get('class/:classOfferingId/gradebook')
  getGradebook(@Headers() headers, @Param('classOfferingId') classOfferingId: string) {
    return this.gradingService.getGradebook(this.getTenantId(headers), classOfferingId);
  }

  @Post('entries')
  enterGrade(@Headers() headers, @Body() body, @Req() req: any) {
    // Ideally user ID comes from auth context, for now we mock or use body if available
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.gradingService.enterGrade(this.getTenantId(headers), body, userId);
  }

  @Post('entries/bulk')
  bulkEnterGrades(@Headers() headers, @Body() body, @Req() req: any) {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.gradingService.bulkEnterGrades(this.getTenantId(headers), body, userId);
  }

  @Post('class/:classOfferingId/finalize')
  finalizeGrades(@Headers() headers, @Param('classOfferingId') classOfferingId: string, @Query('termId') termId: string) {
    return this.gradingService.finalizeGrades(this.getTenantId(headers), classOfferingId, termId);
  }

  // ============================
  // Honor Roll Config
  // ============================
  @Get('honor-roll')
  listHonorRollConfigs(@Headers() headers, @Query() query) {
    return this.gradingService.listHonorRollConfigs(this.getTenantId(headers), query);
  }

  @Post('honor-roll')
  createHonorRollConfig(@Headers() headers, @Body() body) {
    return this.gradingService.createHonorRollConfig(this.getTenantId(headers), body);
  }
}
