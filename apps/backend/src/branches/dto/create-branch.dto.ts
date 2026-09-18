import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Holy Angel Main Campus', description: 'Branch/campus name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MAIN', description: 'Unique branch code within the tenant' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'UUID of the parent tenant' })
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({ example: '123 Main St, Angeles City', description: 'Physical address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '123-456-789-000', description: 'Tax Identification Number (BIR)' })
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional({ example: '001', description: 'BIR branch registration code' })
  @IsOptional()
  @IsString()
  birBranchCode?: string;

  @ApiPropertyOptional({
    example: ['elementary', 'jhs', 'shs', 'college'],
    description: 'Academic levels offered at this branch',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  levelsOffered?: string[];
}
