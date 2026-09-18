import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateRoomAssetDto {
  @ApiProperty({ description: 'Tenant UUID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Branch UUID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Room UUID' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ example: 'PROJ-001', description: 'Unique asset tag' })
  @IsString()
  @IsNotEmpty()
  assetTag: string;

  @ApiProperty({ example: 'projector', description: 'Asset type (FK → lookup_items Asset Types)' })
  @IsString()
  @IsNotEmpty()
  assetType: string;

  @ApiPropertyOptional({ example: 'good', enum: ['good', 'fair', 'poor'], description: 'Asset condition' })
  @IsOptional()
  @IsIn(['good', 'fair', 'poor'])
  condition?: string;

  @ApiPropertyOptional({ example: false, description: 'Maintenance flag' })
  @IsOptional()
  @IsBoolean()
  maintenanceFlag?: boolean;

  @ApiPropertyOptional({ example: 'Epson EB-X51', description: 'Notes about the asset' })
  @IsOptional()
  @IsString()
  notes?: string;
}
