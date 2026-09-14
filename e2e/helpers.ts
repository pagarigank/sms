import { Page, expect } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

export const BASE = 'http://localhost:3001';
export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const ADMIN = { email: 'admin@demo-school.ph', password: 'admin123' };

/* ------------------------------------------------------------------ */
/*  Login via the real login form (form-only, no token injection).    */
/* ------------------------------------------------------------------ */

export async function loginViaForm(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await expect(page.locator('h1')).toContainText('SchoolSuite');
  await page.fill('#email', ADMIN.email);
  await page.fill('#password', ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 30_000 });
}

/* ------------------------------------------------------------------ */
/*  Bootstrap reference data via API (faster + more reliable than     */
/*  clicking through every config screen). Tests then drive only the  */
/*  target screens via forms.                                         */
/* ------------------------------------------------------------------ */

async function apiLogin(): Promise<string> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  const body = await res.json();
  if (!body.accessToken) throw new Error(`API login failed: ${JSON.stringify(body).slice(0, 200)}`);
  return body.accessToken;
}

export interface RefData {
  token: string;
  tenantId: string;
  branchId: string;
  schoolYearId: string;
  educationLevels: { id: string; name: string }[];
}

export async function bootstrap(): Promise<RefData> {
  const token = await apiLogin();
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const get = async (path: string) => {
    const res = await fetch(`${API}${path}`, { headers: h });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    const body = await res.json();
    return Array.isArray(body) ? body : body.data ?? body;
  };

  const tenants = await get('/api/v1/tenants');
  const tenant = tenants[0];
  if (!tenant) throw new Error('No tenants seeded');

  const branches = await get(`/api/v1/tenants/${tenant.id}/branches`);
  const branch = Array.isArray(branches) ? branches[0] : branches?.data?.[0];
  if (!branch) throw new Error('No branches seeded');

  const schoolYears = await get('/api/v1/academic/school-years');
  const schoolYear = schoolYears[0];
  if (!schoolYear) throw new Error('No school years seeded');

  let educationLevels: { id: string; name: string }[] = [];
  try {
    educationLevels = await get('/api/v1/academic/education-levels');
  } catch {
    // optional reference data — K12/college specs fall back to label matching
  }

  return {
    token,
    tenantId: tenant.id,
    branchId: branch.id,
    schoolYearId: schoolYear.id,
    educationLevels,
  };
}

/* ------------------------------------------------------------------ */
/*  Form interaction helpers                                          */
/* ------------------------------------------------------------------ */

export async function selectNativeOption(page: Page, selector: string, labelPrefix: string): Promise<void> {
  const value = await page
    .locator(`${selector} option`, { hasText: labelPrefix })
    .first()
    .getAttribute('value');
  await page.selectOption(selector, value ?? '');
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}
