import type { ApiClient } from '../client';
import type { Building, Floor, Room, RoomAsset } from '../types';

export const facilityEndpoints = (client: ApiClient) => ({
  // Buildings
  listBuildings: (params?: { branchId?: string }) =>
    client.get<Building[]>('/api/v1/facility/buildings', params as Record<string, string>),

  getBuilding: (id: string) =>
    client.get<Building>(`/api/v1/facility/buildings/${id}`),

  createBuilding: (data: { name: string; branchId: string; code?: string; address?: string }) =>
    client.post<Building>('/api/v1/facility/buildings', data),

  deleteBuilding: (id: string) =>
    client.delete<void>(`/api/v1/facility/buildings/${id}`),

  // Floors
  listFloors: (buildingId: string) =>
    client.get<Floor[]>(`/api/v1/facility/buildings/${buildingId}/floors`),

  getFloor: (id: string) =>
    client.get<Floor>(`/api/v1/facility/floors/${id}`),

  createFloor: (data: { buildingId: string; label: string; floorNumber: number }) =>
    client.post<Floor>('/api/v1/facility/floors', data),

  deleteFloor: (id: string) =>
    client.delete<void>(`/api/v1/facility/floors/${id}`),

  // Rooms
  listRooms: (params?: { branchId?: string; floorId?: string }) =>
    client.get<Room[]>('/api/v1/facility/rooms', params as Record<string, string>),

  getRoom: (id: string) =>
    client.get<Room>(`/api/v1/facility/rooms/${id}`),

  createRoom: (data: { floorId: string; branchId: string; name: string; roomType: string; capacity?: number }) =>
    client.post<Room>('/api/v1/facility/rooms', data),

  deleteRoom: (id: string) =>
    client.delete<void>(`/api/v1/facility/rooms/${id}`),

  // Room Assets
  listRoomAssets: (roomId: string) =>
    client.get<RoomAsset[]>(`/api/v1/facility/rooms/${roomId}/assets`),

  createRoomAsset: (data: { roomId: string; assetType: string; assetTag?: string; description?: string }) =>
    client.post<RoomAsset>('/api/v1/facility/room-assets', data),

  deleteRoomAsset: (id: string) =>
    client.delete<void>(`/api/v1/facility/room-assets/${id}`),

  // Conflict check
  checkConflict: (roomId: string, params: { start: string; end: string }) =>
    client.get<{ available: boolean }>(`/api/v1/facility/rooms/${roomId}/conflict-check`, params as Record<string, string>),
});
