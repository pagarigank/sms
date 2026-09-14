import type { ApiClient } from '../client';

export function schedulingEndpoints(client: ApiClient) {
  return {
    listOfferings: (params: { tenantId: string; branchId?: string; schoolYearId?: string; termId?: string }) =>
      client.get('/api/v1/scheduling/offerings', params as any),

    createOffering: (data: any) =>
      client.post('/api/v1/scheduling/offerings', data),

    updateOffering: (id: string, data: any) =>
      client.put(`/api/v1/scheduling/offerings/${id}`, data),

    checkConflict: (data: any) =>
      client.post('/api/v1/scheduling/offerings/check-conflict', data),

    getFacultyLoad: (params: { tenantId: string; employeeId: string; termId: string }) =>
      client.get(`/api/v1/scheduling/faculty/${params.employeeId}/load`, { termId: params.termId }),

    getTimetable: (params: { tenantId: string; sectionId: string; termId: string }) =>
      client.get('/api/v1/scheduling/timetable', params as any),

    listCalendars: (params: { tenantId: string; branchId?: string }) =>
      client.get('/api/v1/scheduling/calendars', params as any),

    createCalendar: (data: any) =>
      client.post('/api/v1/scheduling/calendars', data),

    getCalendarEvents: (calendarId: string) =>
      client.get(`/api/v1/scheduling/calendars/${calendarId}/events`),

    createEvent: (data: any) =>
      client.post('/api/v1/scheduling/calendars/events', data),

    getStudentSchedule: (studentId: string) =>
      client.get(`/api/v1/scheduling/students/${studentId}/schedule`),
  };
}
