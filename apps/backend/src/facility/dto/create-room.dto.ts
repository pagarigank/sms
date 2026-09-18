import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: 'Tenant UUID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Branch UUID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Parent floor UUID' })
  @IsUUID()
  floorId: string;

  @ApiProperty({ example: 'Room 101', description: 'Room name/number' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'classroom', description: 'Room type (FK → lookup_items)' })
  @IsString()
  @IsNotEmpty()
  roomType: string;

  @ApiPropertyOptional({ example: 40, description: 'Room capacity' })
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @ApiPropertyOptional({ example: 'Rows of 2', description: 'Seating layout descriptor' })
  @IsOptional()
  @IsString()
  seatingLayout?: string;

  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'under_maintenance', 'closed'],
    description: 'Room status',
  })
  @IsOptional()
  @IsIn(['active', 'under_maintenance', 'closed'])
  status?: string;

  @ApiPropertyOptional({ example: ['projector', 'aircon'], description: 'Equipment tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentTags?: string[];
}
