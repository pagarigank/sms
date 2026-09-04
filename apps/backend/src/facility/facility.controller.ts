import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FacilityService } from './facility.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateRoomAssetDto } from './dto/create-room-asset.dto';

@ApiTags('facility')
@ApiBearerAuth('access-token')
@Controller('facility')
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  // === Buildings ===
  @Get('buildings')
  @ApiOperation({ summary: 'List buildings', description: 'Returns all buildings for a branch.' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'List of buildings with floors.' })
  findAllBuildings(@Query('tenantId') tenantId: string, @Query('branchId') branchId?: string) {
    return this.facilityService.findAllBuildings(tenantId, branchId);
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Get building detail', description: 'Returns a building with all floors and rooms.' })
  @ApiResponse({ status: 200, description: 'Building with nested floors and rooms.' })
  @ApiResponse({ status: 404, description: 'Building not found.' })
  findOneBuilding(@Param('id') id: string) {
    return this.facilityService.findOneBuilding(id);
  }

  @Post('buildings')
  @ApiOperation({ summary: 'Create a building', description: 'Create a new building within a branch.' })
  @ApiResponse({ status: 201, description: 'Building created.' })
  createBuilding(@Body() dto: CreateBuildingDto) {
    return this.facilityService.createBuilding(dto);
  }

  @Delete('buildings/:id')
  @ApiOperation({ summary: 'Delete a building', description: 'Soft-delete a building (cascades to floors/rooms).' })
  @ApiResponse({ status: 200, description: 'Building deleted.' })
  removeBuilding(@Param('id') id: string) {
    return this.facilityService.removeBuilding(id);
  }

  // === Floors ===
  @Get('buildings/:buildingId/floors')
  @ApiOperation({ summary: 'List floors in a building' })
  @ApiResponse({ status: 200, description: 'List of floors with rooms.' })
  findFloors(@Param('buildingId') buildingId: string) {
    return this.facilityService.findFloorsByBuilding(buildingId);
  }

  @Get('floors/:id')
  @ApiOperation({ summary: 'Get floor detail' })
  @ApiResponse({ status: 200, description: 'Floor with rooms.' })
  findOneFloor(@Param('id') id: string) {
    return this.facilityService.findOneFloor(id);
  }

  @Post('floors')
  @ApiOperation({ summary: 'Create a floor', description: 'Add a floor to a building. Unique per (building, floor_number).' })
  @ApiResponse({ status: 201, description: 'Floor created.' })
  @ApiResponse({ status: 409, description: 'Floor number already exists in this building.' })
  createFloor(@Body() dto: CreateFloorDto) {
    return this.facilityService.createFloor(dto);
  }

  @Delete('floors/:id')
  @ApiOperation({ summary: 'Delete a floor' })
  @ApiResponse({ status: 200, description: 'Floor deleted.' })
  removeFloor(@Param('id') id: string) {
    return this.facilityService.removeFloor(id);
  }

  // === Rooms ===
  @Get('rooms')
  @ApiOperation({ summary: 'List rooms', description: 'Returns all rooms for a branch.' })
  @ApiQuery({ name: 'branchId', required: true })
  @ApiResponse({ status: 200, description: 'List of rooms with assets.' })
  findRooms(@Query('branchId') branchId: string) {
    return this.facilityService.findRooms(branchId);
  }

  @Get('floors/:floorId/rooms')
  @ApiOperation({ summary: 'List rooms on a floor' })
  @ApiResponse({ status: 200, description: 'List of rooms.' })
  findRoomsByFloor(@Param('floorId') floorId: string) {
    return this.facilityService.findRoomsByFloor(floorId);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get room detail', description: 'Returns room with floor info and assets.' })
  @ApiResponse({ status: 200, description: 'Room detail.' })
  findOneRoom(@Param('id') id: string) {
    return this.facilityService.findOneRoom(id);
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Create a room', description: 'Create a room within a floor. Supports room type, capacity, equipment tags, and status.' })
  @ApiResponse({ status: 201, description: 'Room created.' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.facilityService.createRoom(dto);
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted.' })
  removeRoom(@Param('id') id: string) {
    return this.facilityService.removeRoom(id);
  }

  // === Room Conflict Check (Stub) ===
  @Get('rooms/:roomId/conflict-check')
  @ApiOperation({
    summary: 'Check room availability (stub)',
    description: 'Returns whether a room is free for a given time slot. Full implementation in Phase 5 with class_offerings.',
  })
  @ApiQuery({ name: 'branchId', required: true })
  @ApiQuery({ name: 'dayOfWeek', required: true, example: 'Mon' })
  @ApiQuery({ name: 'startTime', required: true, example: '08:00' })
  @ApiQuery({ name: 'endTime', required: true, example: '09:00' })
  @ApiQuery({ name: 'termId', required: false })
  @ApiQuery({ name: 'excludeOfferingId', required: false })
  @ApiResponse({ status: 200, description: '{ isFree: true/false }' })
  checkRoomConflict(
    @Param('roomId') roomId: string,
    @Query('branchId') branchId: string,
    @Query('dayOfWeek') dayOfWeek: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('termId') termId?: string,
    @Query('excludeOfferingId') excludeOfferingId?: string,
  ) {
    return this.facilityService.isRoomFree(branchId, roomId, dayOfWeek, startTime, endTime, termId, excludeOfferingId);
  }

  // === Room Assets ===
  @Get('rooms/:roomId/assets')
  @ApiOperation({ summary: 'List room assets', description: 'Returns all assets (projectors, PCs, etc.) for a room.' })
  @ApiResponse({ status: 200, description: 'List of room assets.' })
  findAssets(@Param('roomId') roomId: string) {
    return this.facilityService.findAssetsByRoom(roomId);
  }

  @Post('room-assets')
  @ApiOperation({ summary: 'Add a room asset', description: 'Register a lightweight asset (projector, aircon, PC) for a room. Supports asset tag, type, condition, and maintenance flag.' })
  @ApiResponse({ status: 201, description: 'Asset created.' })
  createAsset(@Body() dto: CreateRoomAssetDto) {
    return this.facilityService.createRoomAsset(dto);
  }

  @Delete('room-assets/:id')
  @ApiOperation({ summary: 'Remove a room asset' })
  @ApiResponse({ status: 200, description: 'Asset removed.' })
  removeAsset(@Param('id') id: string) {
    return this.facilityService.removeRoomAsset(id);
  }
}
