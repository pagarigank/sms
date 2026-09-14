import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Room } from './room.entity';
import { RoomAsset } from './room-asset.entity';

@Injectable()
export class FacilityService {
  constructor(
    @InjectRepository(Building) private buildingsRepo: Repository<Building>,
    @InjectRepository(Floor) private floorsRepo: Repository<Floor>,
    @InjectRepository(Room) private roomsRepo: Repository<Room>,
    @InjectRepository(RoomAsset) private roomAssetsRepo: Repository<RoomAsset>,
  ) {}

  // === Buildings ===
  async findAllBuildings(tenantId: string, branchId?: string): Promise<Building[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.buildingsRepo.find({ where, relations: ['floors'] });
  }

  async findOneBuilding(id: string): Promise<Building> {
    const building = await this.buildingsRepo.findOne({ where: { id }, relations: ['floors', 'floors.rooms'] });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }

  async createBuilding(data: Partial<Building>): Promise<Building> {
    const building = this.buildingsRepo.create(data);
    return this.buildingsRepo.save(building);
  }

  async updateBuilding(id: string, data: Partial<Building>): Promise<Building> {
    await this.buildingsRepo.update(id, data);
    return this.findOneBuilding(id);
  }

  async removeBuilding(id: string): Promise<void> {
    const result = await this.buildingsRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Building ${id} not found`);
  }

  // === Floors ===
  async findFloorsByBuilding(buildingId: string): Promise<Floor[]> {
    return this.floorsRepo.find({ where: { buildingId }, relations: ['rooms'] });
  }

  async findOneFloor(id: string): Promise<Floor> {
    const floor = await this.floorsRepo.findOne({ where: { id }, relations: ['rooms'] });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
    return floor;
  }

  async createFloor(data: Partial<Floor>): Promise<Floor> {
    // Check uniqueness of (buildingId, floorNumber)
    if (data.floorNumber !== undefined) {
      const existing = await this.floorsRepo.findOne({
        where: { buildingId: data.buildingId, floorNumber: data.floorNumber },
      });
      if (existing) throw new ConflictException(`Floor number ${data.floorNumber} already exists in this building`);
    }
    const floor = this.floorsRepo.create(data);
    return this.floorsRepo.save(floor);
  }

  async updateFloor(id: string, data: Partial<Floor>): Promise<Floor> {
    const floor = await this.floorsRepo.findOneBy({ id });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
    // Enforce uniqueness when changing floor number within the same building.
    if (data.floorNumber !== undefined && data.floorNumber !== floor.floorNumber) {
      const existing = await this.floorsRepo.findOne({
        where: { buildingId: floor.buildingId, floorNumber: data.floorNumber },
      });
      if (existing) throw new ConflictException(`Floor number ${data.floorNumber} already exists in this building`);
    }
    Object.assign(floor, data);
    return this.floorsRepo.save(floor);
  }

  async removeFloor(id: string): Promise<void> {
    const result = await this.floorsRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Floor ${id} not found`);
  }

  // === Rooms ===
  async findRooms(branchId: string): Promise<Room[]> {
    return this.roomsRepo.find({ where: { branchId }, relations: ['floor', 'assets'] });
  }

  async findRoomsByFloor(floorId: string): Promise<Room[]> {
    return this.roomsRepo.find({ where: { floorId }, relations: ['assets'] });
  }

  async findOneRoom(id: string): Promise<Room> {
    const room = await this.roomsRepo.findOne({ where: { id }, relations: ['floor', 'assets'] });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }

  async createRoom(data: Partial<Room>): Promise<Room> {
    const room = this.roomsRepo.create(data);
    return this.roomsRepo.save(room);
  }

  async updateRoom(id: string, data: Partial<Room>): Promise<Room> {
    await this.roomsRepo.update(id, data);
    return this.findOneRoom(id);
  }

  async removeRoom(id: string): Promise<void> {
    const result = await this.roomsRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Room ${id} not found`);
  }

  // === Room Assets ===
  async findAssetsByRoom(roomId: string): Promise<RoomAsset[]> {
    return this.roomAssetsRepo.find({ where: { roomId } });
  }

  async createRoomAsset(data: Partial<RoomAsset>): Promise<RoomAsset> {
    const asset = this.roomAssetsRepo.create(data);
    return this.roomAssetsRepo.save(asset);
  }

  async removeRoomAsset(id: string): Promise<void> {
    const result = await this.roomAssetsRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Room asset ${id} not found`);
  }

  // === Room Conflict Check (Stub for Phase 5/6) ===
  /**
   * Check if a room is free for a given time slot.
   * Stub implementation — full version in Phase 5 with class_offerings.
   * Signature: isRoomFree(branch_id, room_id, day, start, end, term_id, exclude_offering_id)
   */
  async isRoomFree(
    branchId: string,
    roomId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    termId?: string,
    excludeOfferingId?: string,
  ): Promise<{ isFree: boolean; conflictWith?: string }> {
    // Phase 5 will query class_offerings for room conflicts
    // For now, always return free
    return { isFree: true };
  }
}
