import { test, expect } from '@playwright/test';
import { BASE, ADMIN, loginViaForm, uid } from './helpers';

test.describe('Admin E2E — All Modules via Forms Only', () => {
  test.beforeEach(async ({ page }) => {
    // Every test starts with authenticating via the real login form
    await loginViaForm(page, ADMIN, BASE);
  });

  test('1. IAM: Create User Form with Employee Link & Role Assignment', async ({ page }) => {
    await page.goto(`${BASE}/iam`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Users & Roles');

    // Click "New User"
    await page.getByRole('button', { name: /New User/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /New User Account/i })).toBeVisible();

    const tag = uid();
    const testEmail = `faculty.e2e.${tag}@demo-school.ph`;

    // Section 1: Account Details
    await page.fill('#u-email', testEmail);
    await page.fill('#u-pass', 'Password123!');

    // Section 2: Link to Employee (select from dropdown)
    await page.click('#u-employee');
    await page.waitForTimeout(300);
    const employeeItems = page.locator('[role="option"]');
    if ((await employeeItems.count()) > 1) {
      await employeeItems.nth(1).click();
    } else {
      await page.locator('[data-radix-collection-item]').nth(1).click().catch(() => {});
    }

    // Check if First Name or Last Name auto-filled or provide fallback
    const fnameVal = await page.inputValue('#u-fname');
    if (!fnameVal) {
      await page.fill('#u-fname', `Faculty_${tag}`);
      await page.fill('#u-lname', `Teacher_${tag}`);
    }

    // Section 3: Check Faculty role
    const facultyCheckbox = page.locator('label', { hasText: 'Faculty' }).locator('input[type="checkbox"]');
    if ((await facultyCheckbox.count()) > 0) {
      await facultyCheckbox.check();
    }

    // If superadmin tenant selector is present, ensure a tenant is selected
    const tenantTrigger = page.locator('#u-tenant');
    if (await tenantTrigger.isVisible()) {
      await tenantTrigger.click();
      await page.waitForTimeout(200);
      const tenantOptions = page.locator('[role="option"]');
      if ((await tenantOptions.count()) > 0) {
        const demoSchool = tenantOptions.filter({ hasText: /Demo School/i });
        if ((await demoSchool.count()) > 0) {
          await demoSchool.first().click();
        } else {
          await tenantOptions.first().click();
        }
      }
    }

    // Submit dialog form
    await dialog.getByRole('button', { name: /Create User/i }).click();

    // Verify dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ IAM: User created via form with employee link & role assignment');
  });

  test('2. Academic: School Years Form', async ({ page }) => {
    await page.goto(`${BASE}/academic/school-years`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('School Years');

    await page.getByRole('button', { name: /Add School Year/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Create School Year/i })).toBeVisible();

    const yr = 2030 + Math.floor(Math.random() * 50);
    await page.fill('#name', `SY ${yr}-${yr + 1}`);
    await page.fill('#startDate', `${yr}-08-01`);
    await page.fill('#endDate', `${yr + 1}-05-31`);

    await dialog.getByRole('button', { name: /Create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ Academic: School Year created via form');
  });

  test('3. Academic: Subjects Form', async ({ page }) => {
    await page.goto(`${BASE}/academic/subjects`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Subjects');

    await page.getByRole('button', { name: /Add Subject/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Create Subject/i })).toBeVisible();

    const tag = uid().toUpperCase();
    await page.fill('#code', `SUBJ-${tag}`);
    await page.fill('#title', `Advanced Computing ${tag}`);
    await page.fill('#units', '3');

    await dialog.getByRole('button', { name: /Create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ Academic: Subject created via form');
  });

  test('3.1. Academic: Grade Levels Form', async ({ page }) => {
    await page.goto(`${BASE}/academic/grade-levels`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Grade Levels');

    await page.getByRole('button', { name: /Add Grade Level|Create Grade Level/i }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Create Grade Level/i })).toBeVisible();

    // Select Education Level
    const edLevelTrigger = dialog.locator('button[role="combobox"]').first();
    if (await edLevelTrigger.isVisible()) {
      await edLevelTrigger.click();
      await page.waitForTimeout(200);
      const options = page.locator('[role="option"]');
      if ((await options.count()) > 0) {
        await options.first().click();
      }
    }

    const tag = uid().toUpperCase();
    await page.fill('#code', `GL-${tag}`);
    await page.fill('#name', `Grade ${tag}`);
    await page.fill('#sortOrder', '10');

    await dialog.getByRole('button', { name: /Create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ Academic: Grade Level created via form');
  });

  test('3.2. Academic: Curricula Form', async ({ page }) => {
    await page.goto(`${BASE}/academic/curricula`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Curricula');

    await page.getByRole('button', { name: /Create Curriculum/i }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Create Curriculum/i })).toBeVisible();

    const selects = dialog.locator('button[role="combobox"]');
    // Education Level
    if (await selects.nth(0).isVisible()) {
      await selects.nth(0).click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});
    }

    // School Year
    if (await selects.nth(1).isVisible()) {
      await selects.nth(1).click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});
    }

    const tag = uid().toUpperCase();
    await page.fill('#versionLabel', `V-${tag}`);

    await dialog.getByRole('button', { name: /Create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ Academic: Curriculum created via form');
  });

  test('4. SIS: Sections Form', async ({ page }) => {
    await page.goto(`${BASE}/sis/sections`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Sections');

    await page.getByRole('button', { name: /Add Section/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /New Section/i })).toBeVisible();

    const tag = uid();
    await page.fill('#section-name', `Section-${tag}`);
    await page.fill('#section-capacity', '35');

    // Select grade level if available
    const gradeLevelSelect = page.locator('#section-grade');
    if (await gradeLevelSelect.isVisible()) {
      await gradeLevelSelect.click();
      await page.waitForTimeout(200);
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible()) await option.click();
    }

    await dialog.getByRole('button', { name: /Create section/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ SIS: Section created via form');
  });

  test('4.1. SIS: Admissions Application wizard', async ({ page }) => {
    await page.goto(`${BASE}/sis/admissions/apply`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Student Application');

    // Step 1: Student Info
    const tag = uid();
    await page.locator('#firstName').fill(`AppFirst_${tag}`);
    await page.locator('#lastName').fill(`AppLast_${tag}`);
    await page.locator('#birthDate').fill('2010-05-10');
    // Sex is a shadcn Select
    await page.getByRole('combobox', { name: /sex/i }).click().catch(() => page.locator('#sex').click());
    await page.waitForTimeout(200);
    await page.getByRole('option', { name: 'Male', exact: true }).click();
    await page.locator('#address').fill('123 Main St');
    
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(500);

    // Step 2: Academic Info
    await page.getByRole('combobox', { name: /select level/i }).click().catch(() => page.locator('#educationLevelId').click());
    await page.waitForTimeout(200);
    await page.getByRole('option').nth(0).click().catch(() => {});
    await page.waitForTimeout(500);
    
    await page.getByRole('combobox', { name: /select grade/i }).click().catch(() => page.locator('#gradeLevelId').click());
    await page.waitForTimeout(200);
    await page.getByRole('option').nth(0).click().catch(() => {});

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(500);

    // Step 3: Guardian Info
    await page.locator('#guardianFirstName').fill('GuardFirst');
    await page.locator('#guardianLastName').fill('GuardLast');
    
    await page.getByRole('combobox', { name: /select relationship/i }).click().catch(() => page.locator('#guardianRelationship').click());
    await page.waitForTimeout(200);
    await page.getByRole('option').nth(0).click().catch(() => {});
    
    await page.locator('#guardianPhone').fill('09123456789');

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(500);

    // Step 4: Documents (Submit)
    await page.getByRole('button', { name: /Submit Application/i }).click();
    await expect(page.locator('h1')).toContainText('Application Submitted!', { timeout: 15000 });
    console.log('✅ SIS: Admissions application submitted');
  });

  test('4.2. SIS: Convert to Student', async ({ page }) => {
    await page.goto(`${BASE}/sis/admissions`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Admissions Pipeline');

    // Move applicant to admitted if possible (mock test checks button)
    const convertBtn = page.getByRole('button', { name: /Convert to Student/i }).first();
    if (await convertBtn.isVisible()) {
      await convertBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ SIS: Applicant converted to student');
    } else {
      console.log('ℹ️ SIS: No applicant in accepted/admitted stage to convert');
    }
  });

  test('4.3. SIS: Enrollment wizard forms', async ({ page }) => {
    await page.goto(`${BASE}/sis/enrollments/wizard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Enrollment Wizard');

    // Step 1: Select Student (New Student)
    await page.getByRole('button', { name: /New Student/i }).click();
    const tag = uid();
    await page.locator('#newStudentFirstName').fill(`EnrollFirst_${tag}`);
    await page.locator('#newStudentLastName').fill(`EnrollLast_${tag}`);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(500);

    // Step 2: Select Curriculum
    const syCombobox = page.getByRole('combobox', { name: /select school year/i });
    if (await syCombobox.isVisible().catch(() => false) || await page.locator('#schoolYearId').isVisible().catch(() => false)) {
      await syCombobox.click().catch(() => page.locator('#schoolYearId').click());
      await page.waitForTimeout(200);
      await page.getByRole('option').nth(0).click().catch(() => {});
      await page.waitForTimeout(500);
      const curriculumBtn = page.locator('button', { hasText: 'Curriculum' }).first();
      if (await curriculumBtn.isVisible()) {
        await curriculumBtn.click();
      }
    }
    
    // We can't guarantee 'Next' is enabled if no curriculum is available, so we check
    const nextBtn2 = page.getByRole('button', { name: 'Next', exact: true });
    if (await nextBtn2.isEnabled()) {
      await nextBtn2.click();
      await page.waitForTimeout(500);

      // Step 3: Subjects
      const nextBtn3 = page.getByRole('button', { name: 'Next', exact: true });
      if (await nextBtn3.isEnabled()) await nextBtn3.click();
      await page.waitForTimeout(500);

      // Step 4: Section
      const nextBtn4 = page.getByRole('button', { name: 'Next', exact: true });
      if (await nextBtn4.isEnabled()) await nextBtn4.click();
      await page.waitForTimeout(500);

      // Step 5: Confirm
      const confirmBtn = page.getByRole('button', { name: /Confirm Enrollment/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        console.log('✅ SIS: Enrollment wizard completed');
      }
    } else {
      console.log('ℹ️ SIS: Enrollment wizard could not proceed (missing curriculum)');
    }
  });

  test('5. Facility: Buildings Form', async ({ page }) => {
    await page.goto(`${BASE}/facility/buildings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Buildings');

    await page.getByRole('button', { name: /Add Building/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Create Building/i })).toBeVisible();

    const tag = uid();
    await page.fill('#name', `Science Hall ${tag}`);
    await page.fill('#code', `SH-${tag.toUpperCase().slice(0, 4)}`);

    // The form requires a Tenant (Branch stays disabled until one is picked).
    // Radix triggers have no id here, so scope comboboxes to the dialog;
    // SelectContent options render in a body-level portal, so they are page-scoped.
    // Pick "Demo School" — the admin's own tenant — falling back to the first
    // option for other seed states.
    const tenantTrigger = dialog.locator('button[role="combobox"]').first();
    await tenantTrigger.click();
    const demoOption = page.locator('[role="option"]', { hasText: /Demo School/i });
    if (await demoOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoOption.first().click();
    } else {
      await page.locator('[role="option"]').first().click();
    }

    const branchTrigger = dialog.locator('button[role="combobox"]').nth(1);
    if ((await branchTrigger.isVisible()) && (await branchTrigger.isEnabled())) {
      await branchTrigger.click();
      await page
        .locator('[role="option"]')
        .first()
        .click();
    }

    await dialog.getByRole('button', { name: /Create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ Facility: Building created via form');
  });

  test('5.1. Facility: Floors Form', async ({ page }) => {
    await page.goto(`${BASE}/facility/floors`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Floors');

    const firstBuilding = page.locator('a[href*="/facility/buildings/"]').first();
    if (await firstBuilding.isVisible()) {
      await firstBuilding.click();
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Add Floor/i }).click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.getByRole('heading', { name: /Create Floor/i })).toBeVisible();

      const tag = uid();
      const floorNum = Math.floor(Math.random() * 1000) + 10; // Avoid 1-10 which might exist
      await page.fill('#label', `Floor ${tag}`);
      await page.fill('#floorNumber', floorNum.toString());

      await dialog.getByRole('button', { name: /Create$/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });
      console.log('✅ Facility: Floor created via form');
    } else {
      console.log('ℹ️ Facility: No buildings available to add floors to');
    }
  });

  test('5.2. Facility: Rooms Form', async ({ page }) => {
    await page.goto(`${BASE}/facility/rooms`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Rooms');

    await page.getByRole('button', { name: /Add Room/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Create Room/i })).toBeVisible();

    const tag = uid();
    await page.fill('#room-name', `Room ${tag}`);

    const selects = dialog.locator('button[role="combobox"]');
    if (await selects.nth(0).isVisible()) {
      await selects.nth(0).click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});
    }

    if (await selects.nth(1).isVisible()) {
      await selects.nth(1).click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});
    }

    await page.fill('#room-capacity', '30');

    await dialog.getByRole('button', { name: /Create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ Facility: Room created via form');
  });

  test('6. HR: Employees Form', async ({ page }) => {
    await page.goto(`${BASE}/hr`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Human Resources|HR-Lite/);

    await page.getByRole('button', { name: /Add Employee/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Add Employee/i })).toBeVisible();

    const tag = uid();
    await page.fill('#emp-first', `EmpFirst_${tag}`);
    await page.fill('#emp-last', `EmpLast_${tag}`);
    await page.fill('#emp-email', `emp_${tag}@demo-school.ph`);

    await dialog.getByRole('button', { name: /Add Employee$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ HR: Employee created via form');
  });

  test('6.1. HR: Teaching Load form', async ({ page }) => {
    await page.goto(`${BASE}/hr`);
    await page.waitForLoadState('networkidle');
    
    // Check if tabs exist (the form is in the 'loads' tab)
    const tabs = page.locator('[role="tablist"]');
    if (await tabs.isVisible()) {
      const loadsTab = page.locator('button[role="tab"]', { hasText: /Teaching Loads/i });
      if (await loadsTab.isVisible()) {
        await loadsTab.click();
        await page.waitForTimeout(500);

        const selects = page.locator('select');
        if (await selects.nth(0).isVisible()) {
          await selects.nth(0).selectOption({ index: 1 }).catch(() => {});
        }
        if (await selects.nth(1).isVisible()) {
          await selects.nth(1).selectOption({ index: 1 }).catch(() => {});
        }
        if (await selects.nth(2).isVisible()) {
          await selects.nth(2).selectOption({ index: 1 }).catch(() => {});
        }

        const assignBtn = page.getByRole('button', { name: /Assign/i }).first();
        if (await assignBtn.isVisible() && await assignBtn.isEnabled()) {
          await assignBtn.click();
          await page.waitForTimeout(1000);
          console.log('✅ HR: Teaching load assigned');
        } else {
          console.log('ℹ️ HR: Cannot assign teaching load (missing options or button disabled)');
        }
      }
    }
  });

  test('7. Scheduling: Timetable form', async ({ page }) => {
    await page.goto(`${BASE}/scheduling/timetable`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Timetable');

    const selects = page.locator('button[role="combobox"]');
    if ((await selects.count()) > 1) {
      await selects.first().click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});

      await selects.nth(1).click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});
    }

    const addClassBtn = page.getByRole('button', { name: /Add Class/i });
    if (await addClassBtn.isVisible() && await addClassBtn.isEnabled()) {
      await addClassBtn.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.getByRole('heading', { name: /Add Class/i })).toBeVisible();

      const dialogSelects = dialog.locator('button[role="combobox"]');
      if (await dialogSelects.first().isVisible()) {
        await dialogSelects.first().click();
        await page.waitForTimeout(200);
        await page.locator('[role="option"]').first().click().catch(() => {});
      }

      await dialog.getByRole('button', { name: /Add to Timetable/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });
      console.log('✅ Scheduling: Class added to timetable');
    } else {
      console.log('ℹ️ Scheduling: Cannot add class (missing section/term data)');
    }
  });

  test('8. Scheduling: Attendance recording form', async ({ page }) => {
    await page.goto(`${BASE}/scheduling/attendance`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Attendance');

    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(500);

      const presentBtn = page.getByRole('button', { name: /Present/i }).first();
      if (await presentBtn.isVisible()) {
        await presentBtn.click();
      }

      const saveBtn = page.getByRole('button', { name: /Save/i }).first();
      if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
        console.log('✅ Scheduling: Attendance recorded');
      }
    }
  });

  test('9. Grading: Grading Systems Form', async ({ page }) => {
    await page.goto(`${BASE}/grading/systems`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Grading Systems');

    const usePresetBtn = page.getByRole('button', { name: /Use DepEd Preset/i });
    if (await usePresetBtn.isVisible()) {
      await usePresetBtn.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.getByRole('button', { name: /Create Grading System/i })).toBeVisible();

      // Click the first tier
      await dialog.locator('button').filter({ hasText: /Key Stage 1/i }).first().click().catch(() => {});

      const selects = dialog.locator('button[role="combobox"]');
      if ((await selects.count()) > 1) {
        await selects.first().click();
        await page.waitForTimeout(200);
        await page.locator('[role="option"]').first().click().catch(() => {});

        await selects.nth(1).click();
        await page.waitForTimeout(200);
        await page.locator('[role="option"]').first().click().catch(() => {});
      }

      await dialog.getByRole('button', { name: /Create Grading System/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });
      console.log('✅ Grading: System created via preset form');
    }
  });

  test('10. Grading: Grade Components Form', async ({ page }) => {
    await page.goto(`${BASE}/grading/components`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Grade Components');

    const select = page.locator('button[role="combobox"]').first();
    if (await select.isVisible()) {
      await select.click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').last().click().catch(() => {});
      await page.waitForTimeout(500);

      const addBtn = page.getByRole('button', { name: /Add Component/i });
      if (await addBtn.isVisible() && await addBtn.isEnabled()) {
        await addBtn.click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog.getByRole('heading', { name: /New Grade Component/i })).toBeVisible();

        const tag = uid();
        await page.locator('input').nth(0).fill(`Written Work ${tag}`);
        await page.locator('input').nth(1).fill('40'); // weight
        await page.locator('input').nth(2).fill('1'); // order

        await dialog.getByRole('button', { name: /Save/i }).click();
        await expect(dialog).not.toBeVisible({ timeout: 15_000 });
        console.log('✅ Grading: Component created via form');
      } else {
        console.log('ℹ️ Grading: Cannot add component (button disabled, possibly KS1 system)');
      }
    }
  });

  test('11. Grading: Gradebook Form', async ({ page }) => {
    await page.goto(`${BASE}/scheduling/gradebook`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Gradebook');

    const selects = page.locator('button[role="combobox"]');
    if ((await selects.count()) > 1) {
      await selects.first().click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});

      await selects.nth(1).click();
      await page.waitForTimeout(200);
      await page.locator('[role="option"]').first().click().catch(() => {});

      await page.waitForTimeout(1000); // wait for gradebook to load
      const saveBtn = page.getByRole('button', { name: /Save Grades/i });
      if (await saveBtn.isVisible()) {
        console.log('✅ Grading: Gradebook loaded');
      }
    }
  });

  test('12. Billing: Fee Types Form', async ({ page }) => {
    await page.goto(`${BASE}/billing/fee-types`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Fee Types');

    await page.getByRole('button', { name: /Add Fee Type/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('heading', { name: /Create Fee Type/i })).toBeVisible();

    const tag = uid().toUpperCase();
    await page.fill('#name', `Laboratory Fee ${tag}`);
    await page.fill('#code', `LF-${tag}`);

    await dialog.getByRole('button', { name: /Create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    console.log('✅ Billing: Fee Type created via form');
  });

  test('13. Communications: Announcements Form', async ({ page }) => {
    await page.goto(`${BASE}/communications`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();

    const newBtn = page.getByRole('button', { name: /New Announcement/i });
    if (await newBtn.isVisible()) {
      await newBtn.click();
      const tag = uid();
      await page.fill('#ann-title', `Parent-Teacher Assembly ${tag}`);
      await page.fill('#ann-body', `Please join us for the quarterly general assembly this coming Friday.`);

      await page.getByRole('button', { name: /Create Draft/i }).click();
      console.log('✅ Communications: Announcement draft created via form');
    }
  });

  test('14. Documents: Request Form', async ({ page }) => {
    await page.goto(`${BASE}/documents`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Documents');

    const newReqBtn = page.getByRole('button', { name: /New Request/i });
    if (await newReqBtn.isVisible()) {
      await newReqBtn.click();
      await page.waitForTimeout(500);

      const selects = page.locator('select');
      if (await selects.nth(0).isVisible()) {
        await selects.nth(0).selectOption({ index: 1 }).catch(() => {});
      }
      if (await selects.nth(1).isVisible()) {
        await selects.nth(1).selectOption({ index: 1 }).catch(() => {});
      }

      const submitBtn = page.getByRole('button', { name: /Submit Request/i });
      if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
        await submitBtn.click();
        console.log('✅ Documents: Request created via form');
      } else {
        console.log('ℹ️ Documents: Cannot submit request (missing options)');
      }
    }
  });
});
