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

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | null;
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

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
    this.onUnauthorized = config.onUnauthorized;

    this.auth = authEndpoints(this);
    this.tenants = tenantEndpoints(this);
    this.branches = branchEndpoints(this);
    this.departments = departmentEndpoints(this);
    this.users = userEndpoints(this);
    this.iam = iamEndpoints(this);
    this.facility = facilityEndpoints(this);
    this.academic = academicEndpoints(this);
    this.grading = gradingEndpoints(this);
    this.config = configEndpoints(this);
    this.sis = sisEndpoints(this);
    this.admissions = admissionsEndpoints(this);
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
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
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, status: response.status };
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, params);
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
