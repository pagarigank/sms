import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomAssetDto {
  @ApiProperty({ description: 'Tenant UUID' })
  tenantId: string;

  @ApiProperty({ description: 'Branch UUID' })
  branchId: string;

  @ApiProperty({ description: 'Room UUID' })
  roomId: string;

  @ApiProperty({ example: 'PROJ-001', description: 'Unique asset tag' })
  assetTag: string;

  @ApiProperty({ example: 'projector', description: 'Asset type (FK → lookup_items Asset Types)' })
  assetType: string;

  @ApiPropertyOptional({ example: 'good', enum: ['good', 'fair', 'poor'], description: 'Asset condition' })
  condition?: string;

  @ApiPropertyOptional({ example: false, description: 'Maintenance flag' })
  maintenanceFlag?: boolean;

  @ApiPropertyOptional({ example: 'Epson EB-X51', description: 'Notes about the asset' })
  notes?: string;
}
