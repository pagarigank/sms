import { test, expect, Page } from '@playwright/test';
import { BASE, loginViaForm, bootstrap, uid, type RefData } from './helpers';

/**
 * K12 lifecycle — driven through the UI forms only:
 *   1. Admissions: submit the Student Application Form (4-step wizard)
 *   2. Admissions: accept the applicant in the pipeline + Convert to Student
 *   3. Enrollment wizard: enroll the converted student into SY + curriculum + section
 *   4. Billing: generate an invoice from the enrollment
 *   5. Cashiering: open session → process payment → receipt
 */

let ref: RefData;
const APPLICANT = {
  firstName: 'Kai',
  lastName: '',
  gradeIndex: 0,
};

test.beforeAll(async () => {
  ref = await bootstrap();
  APPLICANT.lastName = `Mendoza-${uid()}`;
});

async function goto(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Student Application Form (admissions apply wizard)       */
/* ------------------------------------------------------------------ */

async function submitApplication(page: Page, educationLevelName: string, gradeLevelName: string) {
  await goto(page, '/sis/admissions/apply');
  await expect(page.getByRole('heading', { name: 'Student Application Form' })).toBeVisible();

  const tag = uid();

  // Step 0 — Student Information
  await page.locator('input[type="text"]').nth(0).fill(`Kai${tag}`);
  await page.locator('input[type="text"]').nth(1).fill('Rey');
  await page.locator('input[type="text"]').nth(2).fill(APPLICANT.lastName);
  await page.locator('input[type="text"]').nth(3).fill('123 Mabini St, Quezon City');
  await page.locator('input[type="date"]').fill('2012-05-14');
  await page.locator('select').nth(0).selectOption('male');
  await page.locator('input[type="tel"]').nth(0).fill('09170000001');
  await page.locator('input[type="email"]').nth(0).fill(`kai${tag}@test.ph`);
  await page.getByRole('button', { name: /Next/ }).click();

  // Step 1 — Academic Information
  const eduSelect = page.locator('select').nth(1);
  await eduSelect.selectOption({ label: educationLevelName });
  const gradeSelect = page.locator('select').nth(2);
  await gradeSelect.selectOption({ label: gradeLevelName });
  await page.locator('input[type="text"]').nth(4).fill('St. Scholastica Academy');
  await page.getByRole('button', { name: /Next/ }).click();

  // Step 2 — Guardian Information
  await page.locator('input[type="text"]').nth(5).fill('Maria');
  await page.locator('input[type="text"]').nth(6).fill(APPLICANT.lastName);
  await page.locator('select').nth(3).selectOption('mother');
  await page.locator('input[type="tel"]').nth(1).fill('09170000002');
  await page.locator('input[type="email"]').nth(1).fill(`maria${tag}@test.ph`);
  await page.getByRole('button', { name: /Next/ }).click();

  // Step 3 — Documents (optional) → Submit
  await page.getByRole('button', { name: /Submit Application/ }).click();
  await expect(page.getByText('Application Submitted!')).toBeVisible({ timeout: 20_000 });
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Pipeline: accept + convert                               */
/* ------------------------------------------------------------------ */

async function acceptAndConvert(page: Page): Promise<void> {
  await goto(page, '/sis/admissions');
  await expect(page.getByRole('heading', { name: 'Admissions Pipeline' })).toBeVisible();

  const card = page.locator('div.rounded-lg.border.bg-card', { hasText: APPLICANT.lastName }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  // Move through pipeline stages via each card's native select until Accepted.
  for (let hop = 0; hop < 8; hop++) {
    const stageSelect = card.locator('select');
    const selectedLabel = await stageSelect.locator('option:checked').innerText();
    if (/accepted|admitted/i.test(selectedLabel)) break;

    // pick the next stage: options are labelled "Move to: <Stage>"
    const options = stageSelect.locator('option');
    const n = await options.count();
    let picked = false;
    for (let i = 1; i < n; i++) {
      const label = await options.nth(i).innerText();
      const currentIdx = await stageSelect.locator('option:checked').getAttribute('index').catch(() => null);
      void currentIdx;
      if (label !== selectedLabel) {
        await stageSelect.selectOption({ index: i });
        picked = true;
        break;
        }
    }
    if (!picked) break;

    // wait for pipeline refetch so the card re-renders in the new stage column
    await page.waitForTimeout(800);
  }

  // Convert to Student
  const convertBtn = card.getByRole('button', { name: /Convert to Student/ });
  await expect(convertBtn).toBeVisible({ timeout: 20_000 });
  await convertBtn.click();
  await page.waitForTimeout(1_500); // pipeline refetch
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Enrollment wizard incl. section assignment               */
/* ------------------------------------------------------------------ */

async function enrollStudent(page: Page): Promise<void> {
  await goto(page, '/sis/enrollments/wizard');

  // Step: Select Student — search by last name, pick first card
  const search = page.getByPlaceholder(/Search by name, LRN/);
  await expect(search).toBeVisible();
  await search.fill(APPLICANT.lastName);
  const studentCard = page.locator('button', { hasText: APPLICANT.lastName }).first();
  await expect(studentCard).toBeVisible({ timeout: 15_000 });
  await studentCard.click();

  // Step: Select Curriculum — pick the seeded school year, then a curriculum
  await page.getByRole('button', { name: /^Next/ }).click();
  await page.locator('select').first().selectOption({ index: 1 }); // first non-placeholder SY
  await page.waitForTimeout(600); // curricula load
  const curriculumCard = page.locator('button', { hasText: /Curriculum/ }).first();
  await expect(curriculumCard).toBeVisible({ timeout: 15_000 });
  await curriculumCard.click();

  // Step: Assign Section — pick first active section card
  await page.getByRole('button', { name: /^Next/ }).click();
  const sectionCard = page.locator('button', { hasText: /Capacity/ }).first();
  await expect(sectionCard).toBeVisible({ timeout: 15_000 });
  await sectionCard.click();

  // Step: Confirm
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.getByRole('heading', { name: 'Confirm Enrollment' })).toBeVisible();
  await page.getByRole('button', { name: /Confirm Enrollment/ }).click();
  await page.waitForTimeout(1_500);
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Billing: generate invoice from enrollment                */
/* ------------------------------------------------------------------ */

async function generateInvoice(page: Page): Promise<void> {
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
}

/* ------------------------------------------------------------------ */
/*  Step 5 — Cashiering: open session + process payment               */
/* ------------------------------------------------------------------ */

async function payInvoice(page: Page): Promise<void> {
  // Open a cashier session first (payment screen requires one)
  await goto(page, '/cashiering');
  await page.waitForTimeout(800);
  const openBtn = page.getByRole('button', { name: /Open Session/ });
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
    await page.locator('input[type="number"]').fill('1000');
    await page.locator('.fixed.inset-0').getByRole('button', { name: /Open Session/ }).last().click();
    await expect(page.getByText('Session Active')).toBeVisible({ timeout: 15_000 });
  }

  // Process payment against the K12 invoice
  await goto(page, '/cashiering/payment');
  await page.locator('#invoice').fill('');
  const invoiceField = page.locator('#invoice');
  await invoiceField.click();
  // open picker and select the row for our student
  await page.getByRole('button').filter({ has: page.locator('svg') }).first(); // noop guard
  const pickerRow = page.locator('button', { hasText: APPLICANT.lastName }).first();
  await expect(pickerRow).toBeVisible({ timeout: 15_000 });
  await pickerRow.click();

  const amount = page.locator('#amount');
  await expect(amount).not.toHaveValue('', { timeout: 10_000 });
  const method = page.locator('#method');
  await method.selectOption({ index: 1 });
  await page.getByRole('button', { name: /Record Payment/ }).click();

  await expect(page.getByText('Payment Recorded')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/OR-/)).toBeVisible();
}

test.describe('K12 lifecycle (forms only)', () => {
  test('admission → convert → enroll w/ section → invoice → payment', async ({ page }) => {
    await loginViaForm(page);

    const gradeLevelName = ref.educationLevels.length > 0 ? undefined : 'Grade 7';
    await submitApplication(page, gradeLevelName ?? 'Grade 7', 'Grade 7');
    await acceptAndConvert(page);
    await enrollStudent(page);
    await generateInvoice(page);
    await payInvoice(page);

    // Final interoperability assertion: the invoice list shows the paid invoice
    await goto(page, '/billing/invoices');
    const row = page.locator('tr', { hasText: APPLICANT.lastName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    // Paid status renders as the shared token-based Badge (success variant = green surface)
    await expect(row.locator('[class*="bg-green"], [class*="status-success"], [class*="status-success-surface"]')).toBeVisible();
  });
});
