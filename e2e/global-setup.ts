import { chromium, type FullConfig } from '@playwright/test';

/**
 * Saves an authenticated storage state (localStorage tokens from zustand persist)
 * so specs that opt into it can skip the login form. The lifecycle specs
 * deliberately log in through the form to test it end-to-end.
 */
async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  await page.fill('#email', 'admin@demo-school.ph');
  await page.fill('#password', 'admin123');
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/dashboard', { timeout: 30_000 });

  await page.context().storageState({ path: 'e2e/auth-state.json' });
  await browser.close();
}

export default globalSetup;
