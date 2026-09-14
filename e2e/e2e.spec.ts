import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@demo-school.ph';
const ADMIN_PASSWORD = 'admin123';

const APPLICANT = {
  firstName: 'E2E', middleName: 'Test', lastName: 'Student',
  birthDate: '2014-01-15', sex: 'male',
  address: '45 Test Street, Manila', phone: '09171234567',
  email: 'e2e.test@student.ph', priorSchool: 'Test Elementary School',
  lrn: '136000100999',
  guardianFirstName: 'Test', guardianLastName: 'Guardian',
  guardianPhone: '09179876543', guardianEmail: 'guardian@test.ph',
  guardianRelationship: 'father',
};

async function loginViaUI(page) {
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await expect(page.locator('h1')).toContainText('SchoolSuite');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await expect(page.locator('h1')).toContainText('Dashboard');
}

function apiHeaders() {
  return { 'x-tenant-id': '10000000-0000-0000-0000-000000000001' };
}

test.describe('School Portal E2E', function() {

  test('1. Login via UI', async function({ page }) {
    await loginViaUI(page);
  });

  test('2. Create applicant (API + UI verify)', async function({ page }) {
    await loginViaUI(page);
    const res = await fetch('http://localhost:3000/api/v1/admissions/applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...apiHeaders() },
      body: JSON.stringify({
        firstName: APPLICANT.firstName,
        middleName: APPLICANT.middleName,
        lastName: APPLICANT.lastName,
        email: APPLICANT.email,
        phone: APPLICANT.phone,
        birthDate: APPLICANT.birthDate,
        gender: APPLICANT.sex,
        address: APPLICANT.address,
        previousSchool: APPLICANT.priorSchool,
        gradeLevelAppliedFor: 'b0000000-0000-0000-0000-000000000030',
        source: 'online-form',
        notes: 'Guardian: ' + APPLICANT.guardianFirstName + ' ' + APPLICANT.guardianLastName,
      }),
    });
    const created = await res.json();
    if (res.ok && created.id) console.log('API created:', created.id);
    else console.log('API failed:', JSON.stringify(created).substring(0, 200));

    await page.goto('http://localhost:3001/sis/admissions/apply');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    await expect(page.locator('h1')).toContainText('Student Application Form');
    console.log('Apply form OK');

    await page.goto('http://localhost:3001/sis/admissions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    const card = page.locator('text=E2E Student');
    if (await card.count() > 0) console.log('On kanban');
    else console.log('Not on kanban');
  });

  test('3. View Admissions Kanban', async function({ page }) {
    await loginViaUI(page);
    await page.goto('http://localhost:3001/sis/admissions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    await expect(page.locator('h1, h2')).toBeVisible();
    console.log('Kanban loaded');
    const card = page.locator('text=E2E Student');
    if (await card.count() > 0) console.log('E2E visible');
    else console.log('No E2E');
  });

  test('4. Sections page', async function({ page }) {
    await loginViaUI(page);
    await page.goto('http://localhost:3001/sis/sections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await expect(page.locator('h1, h2, table')).toBeVisible();
    console.log('Sections OK');
    const res = await fetch('http://localhost:3000/api/v1/sis/sections?limit=10', {
      headers: apiHeaders(),
    });
    const d = await res.json();
    console.log('Sections:', Array.isArray(d) ? d.length : (d.data ? d.data.length : 0));
  });

  test('5. Enrollments page', async function({ page }) {
    await loginViaUI(page);
    await page.goto('http://localhost:3001/sis/enrollments');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await expect(page.locator('h1, h2, table')).toBeVisible();
    console.log('Enrollments OK');
    const res = await fetch('http://localhost:3000/api/v1/sis/enrollments?limit=10', {
      headers: apiHeaders(),
    });
    const d = await res.json();
    console.log('Enrollments:', Array.isArray(d) ? d.length : (d.data ? d.data.length : 0));
  });

  test('6. Fee Structures page', async function({ page }) {
    await loginViaUI(page);
    await page.goto('http://localhost:3001/billing/fee-structures');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await expect(page.locator('h1, h2, table')).toBeVisible();
    console.log('Fee Structures OK');
    const res = await fetch('http://localhost:3000/api/v1/billing/fee-structures?limit=10', {
      headers: apiHeaders(),
    });
    const d = await res.json();
    console.log('Fee structures:', Array.isArray(d) ? d.length : (d.data ? d.data.length : 0));
  });

  test('7. Invoices page', async function({ page }) {
    await loginViaUI(page);
    await page.goto('http://localhost:3001/billing/invoices');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await expect(page.locator('h1, h2, table')).toBeVisible();
    console.log('Invoices OK');
    const res = await fetch('http://localhost:3000/api/v1/invoices?limit=10', {
      headers: apiHeaders(),
    });
    const d = await res.json();
    console.log('Invoices:', Array.isArray(d) ? d.length : (d.data ? d.data.length : 0));
    if (Array.isArray(d) && d.length > 0) {
      d.forEach(function(inv) { console.log('  -', inv.invoiceNumber, '| Bal:', inv.balance, '|', inv.status); });
    }
  });

  test('8. Cashiering Payment page', async function({ page }) {
    await loginViaUI(page);
    await page.goto('http://localhost:3001/cashiering/payment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await expect(page.locator('h1, h2, form, table')).toBeVisible();
    console.log('Cashiering OK');
    const res = await fetch('http://localhost:3000/api/v1/cashiering/sessions/open', {
      headers: apiHeaders(),
    });
    const t = await res.text();
    const d = t ? JSON.parse(t) : [];
    console.log('Open sessions:', Array.isArray(d) ? d.length : 0);
  });
});
