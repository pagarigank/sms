import type { ApiClient } from '../client';

export function communicationsEndpoints(client: ApiClient) {
  return {
    // === Templates ===
    getTemplates: (params: { tenantId: string; eventType?: string }) =>
      client.get('/api/v1/communications/templates', params as any),

    createTemplate: (data: any) =>
      client.post('/api/v1/communications/templates', data),

    updateTemplate: (id: string, data: any) =>
      client.put(`/api/v1/communications/templates/${id}`, data),

    // === Rules ===
    getRules: (params: { tenantId: string }) =>
      client.get('/api/v1/communications/rules', params as any),

    createRule: (data: any) =>
      client.post('/api/v1/communications/rules', data),

    // === Channels ===
    getChannels: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/communications/channels', params as any),

    createChannel: (data: any) =>
      client.post('/api/v1/communications/channels', data),

    // === Dispatch ===
    dispatch: (data: any) =>
      client.post('/api/v1/communications/dispatch', data),

    getLogs: (params: { tenantId: string; recipientUserId?: string; status?: string }) =>
      client.get('/api/v1/communications/logs', params as any),

    // === Announcements ===
    getAnnouncements: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/communications/announcements', params as any),

    createAnnouncement: (data: any) =>
      client.post('/api/v1/communications/announcements', data),

    publishAnnouncement: (id: string) =>
      client.put(`/api/v1/communications/announcements/${id}/publish`),

    // === Messages ===
    getThreads: (params: { tenantId: string; userId: string }) =>
      client.get('/api/v1/communications/threads', params as any),

    createThread: (data: any) =>
      client.post('/api/v1/communications/threads', data),

    getMessages: (threadId: string) =>
      client.get(`/api/v1/communications/threads/${threadId}/messages`),

    sendMessage: (threadId: string, data: { body: string }) =>
      client.post(`/api/v1/communications/threads/${threadId}/messages`, data),

    markRead: (id: string) =>
      client.put(`/api/v1/communications/messages/${id}/read`),
  };
}
