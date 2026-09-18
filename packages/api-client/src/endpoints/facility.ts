import type { ApiClient } from '../client';
import type { Building, Floor, Room, RoomAsset } from '../types';

export const facilityEndpoints = (client: ApiClient) => ({
  // Buildings — backend requires tenantId query (RLS-scoped lookup)
  listBuildings: (params?: { tenantId?: string; branchId?: string; limit?: number; search?: string }) => {
    const clean: Record<string, string> = {};
    if (params?.tenantId) clean.tenantId = params.tenantId;
    if (params?.branchId) clean.branchId = params.branchId;
    if (params?.limit !== undefined) clean.limit = String(params.limit);
    if (params?.search) clean.search = params.search;
    return client.get<Building[]>('/api/v1/facility/buildings', Object.keys(clean).length ? clean : undefined);
  },

  getBuilding: (id: string) =>
    client.get<Building>(`/api/v1/facility/buildings/${id}`),

  createBuilding: (data: { name: string; branchId: string; tenantId?: string; code?: string; address?: string }) =>
    client.post<Building>('/api/v1/facility/buildings', data),

  updateBuilding: (id: string, data: Partial<Building>) =>
    client.put<Building>(`/api/v1/facility/buildings/${id}`, data),

  deleteBuilding: (id: string) =>
    client.delete<void>(`/api/v1/facility/buildings/${id}`),

  // Floors — nested route returns floors for one building; the flat
  // GET /facility/floors route does not exist on the backend, so buildingId
  // is required here.
  listFloors: (params: { buildingId: string }) =>
    client.get<Floor[]>(`/api/v1/facility/buildings/${params.buildingId}/floors`),

  getFloor: (id: string) =>
    client.get<Floor>(`/api/v1/facility/floors/${id}`),

  createFloor: (data: { buildingId: string; label: string; floorNumber: number }) =>
    client.post<Floor>('/api/v1/facility/floors', data),

  updateFloor: (id: string, data: Partial<Floor>) =>
    client.put<Floor>(`/api/v1/facility/floors/${id}`, data),

  deleteFloor: (id: string) =>
    client.delete<void>(`/api/v1/facility/floors/${id}`),

  // Rooms
  listRooms: (params?: { branchId?: string; floorId?: string; limit?: number; search?: string; status?: string; roomType?: string }) =>
    client.get<Room[]>('/api/v1/facility/rooms', params as Record<string, string | number | boolean>),

  getRoom: (id: string) =>
    client.get<Room>(`/api/v1/facility/rooms/${id}`),

  createRoom: (data: { floorId: string; branchId: string; name: string; roomType: string; capacity?: number }) =>
    client.post<Room>('/api/v1/facility/rooms', data),

  updateRoom: (id: string, data: Partial<Room>) =>
    client.put<Room>(`/api/v1/facility/rooms/${id}`, data),

  deleteRoom: (id: string) =>
    client.delete<void>(`/api/v1/facility/rooms/${id}`),

  // Room Assets
  listRoomAssets: (roomId: string) =>
    client.get<RoomAsset[]>(`/api/v1/facility/rooms/${roomId}/assets`),

  createRoomAsset: (data: { roomId: string; assetType: string; assetTag?: string; description?: string }) =>
    client.post<RoomAsset>('/api/v1/facility/room-assets', data),

  deleteRoomAsset: (id: string) =>
    client.delete<void>(`/api/v1/facility/room-assets/${id}`),

  // Scheduling conflict check
  checkConflict: (
    roomId: string,
    params: { branchId: string; dayOfWeek: string; startTime: string; endTime: string; termId?: string },
  ) =>
    client.get<{ isFree: boolean }>(`/api/v1/facility/rooms/${roomId}/conflict-check`, params as Record<string, string>),
});
