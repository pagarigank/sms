import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'Holy Angel Main Campus', description: 'Branch/campus name' })
  name: string;

  @ApiProperty({ example: 'MAIN', description: 'Unique branch code within the tenant' })
  code: string;

  @ApiProperty({ description: 'UUID of the parent tenant' })
  tenantId: string;

  @ApiPropertyOptional({ example: '123 Main St, Angeles City', description: 'Physical address' })
  address?: string;

  @ApiPropertyOptional({ example: '123-456-789-000', description: 'Tax Identification Number (BIR)' })
  tin?: string;

  @ApiPropertyOptional({ example: '001', description: 'BIR branch registration code' })
  birBranchCode?: string;

  @ApiPropertyOptional({ example: ['elementary', 'jhs', 'shs', 'college'], description: 'Academic levels offered at this branch' })
  levelsOffered?: string[];
}
