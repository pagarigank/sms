import type { ApiClientConfig, ApiResponse } from './types';
import { authEndpoints } from './endpoints/auth';
import { tenantEndpoints } from './endpoints/tenants';
import { branchEndpoints } from './endpoints/branches';
import { departmentEndpoints } from './endpoints/departments';
import { userEndpoints } from './endpoints/users';
import { iamEndpoints } from './endpoints/iam';
import { facilityEndpoints } from './endpoints/facility';
import { academicEndpoints } from './endpoints/academic';
import { gradingEndpoints } from './endpoints/grading';
import { configEndpoints } from './endpoints/config';
import { sisEndpoints } from './endpoints/sis';
import { admissionsEndpoints } from './endpoints/admissions';
import { schedulingEndpoints } from './endpoints/scheduling';
import { attendanceEndpoints } from './endpoints/attendance';
import { gradingExtendedEndpoints } from './endpoints/grading-extended';
import { billingEndpoints, invoiceEndpoints } from './endpoints/billing';
import { cashieringEndpoints } from './endpoints/cashiering';
import { communicationsEndpoints } from './endpoints/communications';
import { documentsEndpoints } from './endpoints/documents';
import { hrEndpoints } from './endpoints/hr';
import { reportingEndpoints } from './endpoints/reporting';

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | null;
  private getTenantId?: () => string | null;
  private onUnauthorized?: () => void;

  public auth;
  public tenants;
  public branches;
  public departments;
  public users;
  public iam;
  public facility;
  public academic;
  public grading;
  public config;
    public sis;
    public admissions;
    public scheduling;
    public attendance;
    public billing;
    public invoices;
    public cashiering;
    public communications;
    public documents;
    public hr;
    public reporting;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
    this.getTenantId = config.getTenantId;
    this.onUnauthorized = config.onUnauthorized;

    this.auth = authEndpoints(this);
    this.tenants = tenantEndpoints(this);
    this.branches = branchEndpoints(this);
    this.departments = departmentEndpoints(this);
    this.users = userEndpoints(this);
    this.iam = iamEndpoints(this);
    this.facility = facilityEndpoints(this);
    this.academic = academicEndpoints(this);
    this.grading = { ...gradingEndpoints(this), ...gradingExtendedEndpoints(this) };
    this.config = configEndpoints(this);
    this.sis = sisEndpoints(this);
    this.admissions = admissionsEndpoints(this);
    this.scheduling = schedulingEndpoints(this);
    this.attendance = attendanceEndpoints(this);
    this.billing = billingEndpoints(this);
    this.cashiering = cashieringEndpoints(this);
    this.communications = communicationsEndpoints(this);
    this.documents = documentsEndpoints(this);
    this.hr = hrEndpoints(this);
    this.reporting = reportingEndpoints(this);
    
    this.invoices = invoiceEndpoints(this);
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Tenant context for RLS: backend middleware reads x-tenant-id for
    // pre-auth requests and as a cross-check after JWT verification.
    const tenantId = this.getTenantId?.();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      this.onUnauthorized?.();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as any).message || `HTTP ${response.status}`);
    }

    const data = await response.json() as T;
    return { data, status: response.status };
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, params as Record<string, string>);
  }

  /**
   * Binary download with auth headers (fetch → Blob). Used for generated
   * document PDFs, where browser navigation cannot carry the Authorization
   * header and the download route must stay authenticated.
   */
  async download(path: string): Promise<{ blob: Blob; filename: string | null }> {
    const url = new URL(`${this.baseUrl}${path}`);
    const headers: Record<string, string> = {};
    const token = this.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const tenantId = this.getTenantId?.();
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(url.toString(), { headers });
    if (response.status === 401) {
      this.onUnauthorized?.();
      throw new Error('Unauthorized');
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    return {
      blob: await response.blob(),
      filename: match?.[1] ?? null,
    };
  }

  /**
   * POST that returns the response body as a Blob instead of parsed JSON —
   * same auth headers as `download`, for authenticated binary outputs
   * produced from a request body (e.g. the branding preview PDF).
   */
  async downloadPost(path: string, body?: unknown): Promise<{ blob: Blob; filename: string | null }> {
    const url = new URL(`${this.baseUrl}${path}`);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const tenantId = this.getTenantId?.();
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401) {
      this.onUnauthorized?.();
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as any).message || `HTTP ${response.status}`);
    }

    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    return {
      blob: await response.blob(),
      filename: match?.[1] ?? null,
    };
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}