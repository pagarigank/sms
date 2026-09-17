import { Controller, Get, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SfFormsService } from './sf-forms.service';

@ApiTags('reporting/sf-forms')
@ApiBearerAuth('access-token')
@Controller('reporting/sf-forms')
export class SfFormsController {
  constructor(private readonly sfFormsService: SfFormsService) {}

  @Get('sf1/:sectionId')
  @ApiOperation({ summary: 'Get SF1 (School Register) data for a section' })
  async getSf1(
    @Headers('x-tenant-id') tenantId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.sfFormsService.getSf1(tenantId, sectionId);
  }

  @Get('sf2/:sectionId')
  @ApiOperation({ summary: 'Get SF2 (Daily Attendance) data for a section' })
  async getSf2(
    @Headers('x-tenant-id') tenantId: string,
    @Param('sectionId') sectionId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.sfFormsService.getSf2(tenantId, sectionId, parseInt(month), parseInt(year));
  }

  @Get('sf9/:studentId')
  @ApiOperation({ summary: 'Get SF9 (Report Card) data for a student' })
  async getSf9(
    @Headers('x-tenant-id') tenantId: string,
    @Param('studentId') studentId: string,
    @Query('schoolYearId') schoolYearId: string,
  ) {
    return this.sfFormsService.getSf9(tenantId, studentId, schoolYearId);
  }
}
