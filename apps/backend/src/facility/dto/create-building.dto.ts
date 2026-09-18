import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

// NOTE: every property MUST carry a class-validator decorator. The global
// ValidationPipe runs with `whitelist: true`, which silently strips any
// un-decorated property — a bare TS class here caused `name` to arrive as
// NULL at the DB layer (500 on create).
export class CreateBuildingDto {
  @ApiPropertyOptional({ description: 'Tenant UUID' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Branch UUID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'Main Academic Building', description: 'Building name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'MAB', description: 'Short code for the building' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: '123 Main St, Angeles City', description: 'Address/wing' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 4, description: 'Total number of floors' })
  @IsOptional()
  @IsNumber()
  floorCount?: number;

  @ApiPropertyOptional({ example: 'Building Admin Office', description: 'Building contact info' })
  @IsOptional()
  @IsString()
  contact?: string;
}
