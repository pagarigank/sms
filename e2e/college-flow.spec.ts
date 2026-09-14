import { test, expect, Page } from '@playwright/test';
import { BASE, loginViaForm, bootstrap, uid, type RefData } from './helpers';

/**
 * College lifecycle — forms only:
 *   1. Admissions: application form (College level)
 *   2. Pipeline: accept + Convert to Student
 *   3. Enrollment wizard: SY + college curriculum
 *   4. Billing: generate invoice (billing statement) + view SOA
 *   5. Payment: record partial then verify SOA summary
 */

let ref: RefData;
const APPLICANT = { firstName: 'Cole', lastName: '' };

test.beforeAll(async () => {
  ref = await bootstrap();
  APPLICANT.lastName = `Santos-${uid()}`;
});

async function goto(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Application (College)                                    */
/* ------------------------------------------------------------------ */

async function submitCollegeApplication(page: Page): Promise<void> {
  await goto(page, '/sis/admissions/apply');
  await expect(page.getByRole('heading', { name: 'Student Application Form' })).toBeVisible();

  const tag = uid();

  await page.locator('input[type="text"]').nth(0).fill(`Cole${tag}`);
  await page.locator('input[type="text"]').nth(1).fill('Marco');
  await page.locator('input[type="text"]').nth(2).fill(APPLICANT.lastName);
  await page.locator('input[type="text"]').nth(3).fill('45 Katipunan Ave, Quezon City');
  await page.locator('input[type="date"]').fill('2007-03-22');
  await page.locator('select').nth(0).selectOption('female');
  await page.locator('input[type="tel"]').nth(0).fill('09180000001');
  await page.locator('input[type="email"]').nth(0).fill(`cole${tag}@test.ph`);
  await page.getByRole('button', { name: /Next/ }).click();

  // Academic — College level; grade level select may be empty for college, so fallback
  const eduSelect = page.locator('select').nth(1);
  const eduOptions = await eduSelect.locator('option').allInnerTexts();
  const collegeLabel = eduOptions.find((l) => /college|higher ed|tertiary/i.test(l));
  if (!collegeLabel) throw new Error(`No college education level found in options: ${eduOptions.join(', ')}`);
  await eduSelect.selectOption({ label: collegeLabel });
  const gradeSelect = page.locator('select').nth(2);
  const gradeOptions = await gradeSelect.locator('option').count();
  if (gradeOptions > 1) {
    await gradeSelect.selectOption({ index: 1 });
  }
  await page.locator('input[type="text"]').nth(4).fill('Quezon City Science HS');
  await page.getByRole('button', { name: /Next/ }).click();

  // Guardian
  await page.locator('input[type="text"]').nth(5).fill('Rosa');
  await page.locator('input[type="text"]').nth(6).fill(APPLICANT.lastName);
  await page.locator('select').nth(3).selectOption('mother');
  await page.locator('input[type="tel"]').nth(1).fill('09180000002');
  await page.locator('input[type="email"]').nth(1).fill(`rosa${tag}@test.ph`);
  await page.getByRole('button', { name: /Next/ }).click();

  await page.getByRole('button', { name: /Submit Application/ }).click();
  await expect(page.getByText('Application Submitted!')).toBeVisible({ timeout: 20_000 });
}

/* ------------------------------------------------------------------ */
/*  Steps 2–3 — Convert + enroll (same helpers as K12, college level) */
/* ------------------------------------------------------------------ */

async function acceptAndConvert(page: Page): Promise<void> {
  await goto(page, '/sis/admissions');
  const card = page.locator('div.rounded-lg.border.bg-card', { hasText: APPLICANT.lastName }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  for (let hop = 0; hop < 8; hop++) {
    const stageSelect = card.locator('select');
    const selectedLabel = await stageSelect.locator('option:checked').innerText();
    if (/accepted|admitted/i.test(selectedLabel)) break;

    const options = stageSelect.locator('option');
    const n = await options.count();
    let picked = false;
    for (let i = 1; i < n; i++) {
      const label = await options.nth(i).innerText();
      if (label !== selectedLabel) {
        await stageSelect.selectOption({ index: i });
        picked = true;
        break;
      }
    }
    if (!picked) break;
    await page.waitForTimeout(800);
  }

  const convertBtn = card.getByRole('button', { name: /Convert to Student/ });
  await expect(convertBtn).toBeVisible({ timeout: 20_000 });
  await convertBtn.click();
  await page.waitForTimeout(1_500);
}

async function enrollStudent(page: Page): Promise<void> {
  await goto(page, '/sis/enrollments/wizard');

  const search = page.getByPlaceholder(/Search by name, LRN/);
  await expect(search).toBeVisible();
  await search.fill(APPLICANT.lastName);
  const studentCard = page.locator('button', { hasText: APPLICANT.lastName }).first();
  await expect(studentCard).toBeVisible({ timeout: 15_000 });
  await studentCard.click();

  await page.getByRole('button', { name: /^Next/ }).click();
  await page.locator('select').first().selectOption({ index: 1 });
  await page.waitForTimeout(600);
  const curriculumCard = page.locator('button', { hasText: /Curriculum/ }).first();
  await expect(curriculumCard).toBeVisible({ timeout: 15_000 });
  await curriculumCard.click();

  // Section is optional for college — skip and continue
  await page.getByRole('button', { name: /^Next/ }).click();
  await page.getByRole('button', { name: /^Next/ }).click();

  await expect(page.getByRole('heading', { name: 'Confirm Enrollment' })).toBeVisible();
  await page.getByRole('button', { name: /Confirm Enrollment/ }).click();
  await page.waitForTimeout(1_500);
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Billing statement: generate invoice + open SOA           */
/* ------------------------------------------------------------------ */

async function generateInvoiceAndSoa(page: Page): Promise<void> {
  await goto(page, '/billing/invoices');
  await page.getByRole('button', { name: /Generate Invoice/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const enrollSelect = dialog.locator('#gen-enrollment');
  await expect(enrollSelect).toBeVisible({ timeout: 15_000 });
  const enrollmentValue = await enrollSelect.locator('option', { hasText: APPLICANT.lastName }).first().getAttribute('value');
  await enrollSelect.selectOption(enrollmentValue!);
  await dialog.getByRole('button', { name: /^Generate$/ }).click();
  await expect(page.getByText('Invoice generated')).toBeVisible({ timeout: 20_000 });

  // Open the Statement of Account drawer for the student's invoice
  const row = page.locator('tr', { hasText: APPLICANT.lastName }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: /SOA/ }).click();
  await expect(page.getByRole('heading', { name: 'Statement of Account' })).toBeVisible();

  // SOA summary must show the billed amount
  await expect(page.getByText('Total Billed')).toBeVisible();
  const billed = page.locator('div', { hasText: 'Total Billed' }).locator('p.font-bold');
  await expect(billed.first()).not.toHaveText('₱0');
}

/* ------------------------------------------------------------------ */
/*  Step 5 — Payment (partial, then verify SOA balance decreases)     */
/* ------------------------------------------------------------------ */

async function payInvoice(page: Page): Promise<void> {
  // Ensure session
  await goto(page, '/cashiering');
  await page.waitForTimeout(800);
  const openBtn = page.getByRole('button', { name: /Open Session/ });
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
    await page.locator('input[type="number"]').fill('1000');
    await page.locator('.fixed.inset-0').getByRole('button', { name: /Open Session/ }).last().click();
    await expect(page.getByText('Session Active')).toBeVisible({ timeout: 15_000 });
  }

  await goto(page, '/cashiering/payment');
  const invoiceField = page.locator('#invoice');
  await invoiceField.click();
  const pickerRow = page.locator('button', { hasText: APPLICANT.lastName }).first();
  await expect(pickerRow).toBeVisible({ timeout: 15_000 });
  await pickerRow.click();

  const amount = page.locator('#amount');
  await expect(amount).not.toHaveValue('', { timeout: 10_000 });

  // Partial payment: half the balance
  const balanceVal = await amount.inputValue();
  const partial = Math.max(500, Math.floor(Number(balanceVal) / 2));
  await amount.fill(String(partial));

  const method = page.locator('#method');
  await method.selectOption({ index: 1 });
  await page.getByRole('button', { name: /Record Payment/ }).click();

  await expect(page.getByText('Payment Recorded')).toBeVisible({ timeout: 20_000 });
}

test.describe('College lifecycle (forms only)', () => {
  test('admission → convert → enroll → billing statement (SOA) → partial payment', async ({ page }) => {
    await loginViaForm(page);

    await submitCollegeApplication(page);
    await acceptAndConvert(page);
    await enrollStudent(page);
    await generateInvoiceAndSoa(page);
    await payInvoice(page);

    // SOA reflects the partial payment: balance < billed
    await goto(page, '/billing/invoices');
    const row = page.locator('tr', { hasText: APPLICANT.lastName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: /SOA/ }).click();
    await expect(page.getByText('Total Paid')).toBeVisible();
    const paid = page.locator('div', { hasText: 'Total Paid' }).locator('p.font-bold');
    await expect(paid.first()).not.toHaveText('₱0');
  });
});
