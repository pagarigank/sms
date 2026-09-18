# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\e2e-admin-forms.spec.ts >> Admin E2E — All Modules via Forms Only >> 4.3. SIS: Enrollment wizard forms
- Location: e2e\e2e-admin-forms.spec.ts:268:7

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: /Next/i }) resolved to 2 elements:
    1) <button class="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-base))] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-[hsl(var(--accent))] gradient-bg rounded-lg text-white font-semibold shadow-md shadow-[hsl(var(--accent)/0.30)] hover:opacity-95 hove…>…</button> aka getByRole('button', { name: 'Next', exact: true })
    2) <button id="next-logo" aria-haspopup="menu" data-next-mark="true" aria-expanded="false" data-next-mark-loading="false" aria-label="Open Next.js Dev Tools" data-nextjs-dev-tools-button="true" aria-controls="nextjs-dev-tools-menu">…</button> aka getByRole('button', { name: 'Open Next.js Dev Tools' })

Call log:
  - waiting for getByRole('button', { name: /Next/i })

```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "SchoolSuite SMS" [ref=f1e6] [cursor=pointer]:
        - /url: /dashboard
        - generic [ref=f1e13]:
          - text: SchoolSuite
          - generic [ref=f1e14]: SMS
      - navigation "Main navigation" [ref=f1e15]:
        - paragraph [ref=f1e16]: Overview
        - link "Dashboard" [ref=f1e18] [cursor=pointer]:
          - /url: /dashboard
        - paragraph [ref=f1e25]: People & Campus
        - generic [ref=f1e26]:
          - link "SIS" [ref=f1e27] [cursor=pointer]:
            - /url: /sis
          - generic [ref=f1e34]:
            - link "Students" [ref=f1e35] [cursor=pointer]:
              - /url: /sis/students
            - link "Guardians" [ref=f1e36] [cursor=pointer]:
              - /url: /sis/guardians
            - link "Enrollments" [ref=f1e37] [cursor=pointer]:
              - /url: /sis/enrollments
            - link "Sections" [ref=f1e38] [cursor=pointer]:
              - /url: /sis/sections
            - link "Admissions" [ref=f1e39] [cursor=pointer]:
              - /url: /sis/admissions
        - link "Facility" [ref=f1e41] [cursor=pointer]:
          - /url: /facility
        - link "Departments" [ref=f1e48] [cursor=pointer]:
          - /url: /departments
        - link "HR" [ref=f1e56] [cursor=pointer]:
          - /url: /hr
        - paragraph [ref=f1e70]: Academic
        - link "Academic Setup" [ref=f1e72] [cursor=pointer]:
          - /url: /academic
        - link "Scheduling" [ref=f1e78] [cursor=pointer]:
          - /url: /scheduling
        - link "Gradebook" [ref=f1e83] [cursor=pointer]:
          - /url: /scheduling/gradebook
        - link "Grading Config" [ref=f1e89] [cursor=pointer]:
          - /url: /grading
        - paragraph [ref=f1e94]: Finance
        - link "Billing" [ref=f1e96] [cursor=pointer]:
          - /url: /billing
        - link "Cashiering" [ref=f1e101] [cursor=pointer]:
          - /url: /cashiering
        - paragraph [ref=f1e106]: System
        - link "Communications" [ref=f1e108] [cursor=pointer]:
          - /url: /communications
        - link "Documents" [ref=f1e114] [cursor=pointer]:
          - /url: /documents
        - link "Users & Roles" [ref=f1e120] [cursor=pointer]:
          - /url: /iam
        - link "Reports" [ref=f1e128] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=f1e133] [cursor=pointer]:
          - /url: /settings
      - generic [ref=f1e139]:
        - generic [ref=f1e140]: A
        - generic [ref=f1e141]:
          - paragraph [ref=f1e142]: admin@demo-school.ph
          - paragraph [ref=f1e143]: School Staff
    - generic [ref=f1e144]:
      - banner [ref=f1e145]:
        - generic [ref=f1e147]:
          - combobox "Select tenant" [ref=f1e148] [cursor=pointer]:
            - generic: My Tenant
          - combobox "Select branch" [ref=f1e155] [cursor=pointer]:
            - generic: Main Campus
        - button "Open user menu" [ref=f1e163] [cursor=pointer]:
          - generic [ref=f1e164]: A
          - generic [ref=f1e165]: admin@demo-school.ph
      - main [ref=f1e166]:
        - generic [ref=f1e167]:
          - generic [ref=f1e168]:
            - heading "Enrollment Wizard" [level=1] [ref=f1e169]
            - paragraph [ref=f1e170]: Enroll a student into a school year, curriculum, and section.
          - generic [ref=f1e173]:
            - generic [ref=f1e179]:
              - generic [ref=f1e180]: Student
              - generic [ref=f1e181]: Select applicant
            - generic [ref=f1e187]:
              - generic [ref=f1e188]: Curriculum
              - generic [ref=f1e189]: Program & year
            - generic [ref=f1e196]:
              - generic [ref=f1e197]: Subjects
              - generic [ref=f1e198]: Load batch/irregular
            - generic [ref=f1e206]:
              - generic [ref=f1e207]: Section
              - generic [ref=f1e208]: Assign class section
            - generic [ref=f1e214]:
              - generic [ref=f1e215]: Confirm
              - generic [ref=f1e216]: Review & finalize
          - generic [ref=f1e217]:
            - generic [ref=f1e219]:
              - generic [ref=f1e220]:
                - generic [ref=f1e221]:
                  - heading "Select Student" [level=2] [ref=f1e222]
                  - paragraph [ref=f1e223]: Find an existing student or create a new profile.
                - generic [ref=f1e224]:
                  - button "Existing Student" [ref=f1e225] [cursor=pointer]
                  - button "New Student" [ref=f1e226] [cursor=pointer]
              - generic [ref=f1e227]:
                - generic [ref=f1e228]:
                  - generic [ref=f1e229]: First Name *
                  - textbox "First Name *" [ref=f1e230]: EnrollFirst_f7uiqs
                - generic [ref=f1e231]:
                  - generic [ref=f1e232]: Last Name *
                  - textbox "Last Name *" [active] [ref=f1e233]: EnrollLast_f7uiqs
                - generic [ref=f1e234]:
                  - text: LRN
                  - textbox "LRN" [ref=f1e235]:
                    - /placeholder: 12 digits
                - generic [ref=f1e236]:
                  - text: Birth Date
                  - textbox "Birth Date" [ref=f1e237]
                - generic [ref=f1e238]:
                  - text: Gender
                  - combobox "Gender" [ref=f1e239] [cursor=pointer]:
                    - generic: Select gender...
                - generic [ref=f1e242]:
                  - text: Email
                  - textbox "Email" [ref=f1e243]
                - generic [ref=f1e244]:
                  - text: Phone
                  - textbox "Phone" [ref=f1e245]
            - generic [ref=f1e246]:
              - button "Back" [disabled]
              - button "Next" [ref=f1e247] [cursor=pointer]
  - region "Notifications"
  - button "Open Next.js Dev Tools" [ref=f1e253] [cursor=pointer]
  - alert [ref=f1e257]
```

# Test source

```ts
  178 | 
  179 |     await page.getByRole('button', { name: /Add Section/i }).click();
  180 |     const dialog = page.locator('[role="dialog"]');
  181 |     await expect(dialog.getByRole('heading', { name: /New Section/i })).toBeVisible();
  182 | 
  183 |     const tag = uid();
  184 |     await page.fill('#section-name', `Section-${tag}`);
  185 |     await page.fill('#section-capacity', '35');
  186 | 
  187 |     // Select grade level if available
  188 |     const gradeLevelSelect = page.locator('#section-grade');
  189 |     if (await gradeLevelSelect.isVisible()) {
  190 |       await gradeLevelSelect.click();
  191 |       await page.waitForTimeout(200);
  192 |       const option = page.locator('[role="option"]').first();
  193 |       if (await option.isVisible()) await option.click();
  194 |     }
  195 | 
  196 |     await dialog.getByRole('button', { name: /Create section/i }).click();
  197 |     await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  198 |     console.log('✅ SIS: Section created via form');
  199 |   });
  200 | 
  201 |   test('4.1. SIS: Admissions Application wizard', async ({ page }) => {
  202 |     await page.goto(`${BASE}/sis/admissions/apply`);
  203 |     await page.waitForLoadState('networkidle');
  204 |     await expect(page.locator('h1')).toContainText('Student Application');
  205 | 
  206 |     // Step 1: Student Info
  207 |     const tag = uid();
  208 |     await page.locator('#firstName').fill(`AppFirst_${tag}`);
  209 |     await page.locator('#lastName').fill(`AppLast_${tag}`);
  210 |     await page.locator('#birthDate').fill('2010-05-10');
  211 |     // Sex is a shadcn Select
  212 |     await page.getByRole('combobox', { name: /sex/i }).click().catch(() => page.locator('#sex').click());
  213 |     await page.waitForTimeout(200);
  214 |     await page.getByRole('option', { name: /male/i }).click();
  215 |     await page.locator('#address').fill('123 Main St');
  216 |     
  217 |     await page.getByRole('button', { name: /Next/i }).click();
  218 |     await page.waitForTimeout(500);
  219 | 
  220 |     // Step 2: Academic Info
  221 |     await page.getByRole('combobox', { name: /select level/i }).click().catch(() => page.locator('#educationLevelId').click());
  222 |     await page.waitForTimeout(200);
  223 |     await page.getByRole('option').nth(0).click().catch(() => {});
  224 |     await page.waitForTimeout(500);
  225 |     
  226 |     await page.getByRole('combobox', { name: /select grade/i }).click().catch(() => page.locator('#gradeLevelId').click());
  227 |     await page.waitForTimeout(200);
  228 |     await page.getByRole('option').nth(0).click().catch(() => {});
  229 | 
  230 |     await page.getByRole('button', { name: /Next/i }).click();
  231 |     await page.waitForTimeout(500);
  232 | 
  233 |     // Step 3: Guardian Info
  234 |     await page.locator('#guardianFirstName').fill('GuardFirst');
  235 |     await page.locator('#guardianLastName').fill('GuardLast');
  236 |     
  237 |     await page.getByRole('combobox', { name: /select relationship/i }).click().catch(() => page.locator('#guardianRelationship').click());
  238 |     await page.waitForTimeout(200);
  239 |     await page.getByRole('option').nth(0).click().catch(() => {});
  240 |     
  241 |     await page.locator('#guardianPhone').fill('09123456789');
  242 | 
  243 |     await page.getByRole('button', { name: /Next/i }).click();
  244 |     await page.waitForTimeout(500);
  245 | 
  246 |     // Step 4: Documents (Submit)
  247 |     await page.getByRole('button', { name: /Submit Application/i }).click();
  248 |     await expect(page.locator('h1')).toContainText('Application Submitted!', { timeout: 15000 });
  249 |     console.log('✅ SIS: Admissions application submitted');
  250 |   });
  251 | 
  252 |   test('4.2. SIS: Convert to Student', async ({ page }) => {
  253 |     await page.goto(`${BASE}/sis/admissions`);
  254 |     await page.waitForLoadState('networkidle');
  255 |     await expect(page.locator('h1')).toContainText('Admissions Pipeline');
  256 | 
  257 |     // Move applicant to admitted if possible (mock test checks button)
  258 |     const convertBtn = page.getByRole('button', { name: /Convert to Student/i }).first();
  259 |     if (await convertBtn.isVisible()) {
  260 |       await convertBtn.click();
  261 |       await page.waitForTimeout(1000);
  262 |       console.log('✅ SIS: Applicant converted to student');
  263 |     } else {
  264 |       console.log('ℹ️ SIS: No applicant in accepted/admitted stage to convert');
  265 |     }
  266 |   });
  267 | 
  268 |   test('4.3. SIS: Enrollment wizard forms', async ({ page }) => {
  269 |     await page.goto(`${BASE}/sis/enrollments/wizard`);
  270 |     await page.waitForLoadState('networkidle');
  271 |     await expect(page.locator('h1')).toContainText('Enrollment Wizard');
  272 | 
  273 |     // Step 1: Select Student (New Student)
  274 |     await page.getByRole('button', { name: /New Student/i }).click();
  275 |     const tag = uid();
  276 |     await page.locator('#newStudentFirstName').fill(`EnrollFirst_${tag}`);
  277 |     await page.locator('#newStudentLastName').fill(`EnrollLast_${tag}`);
> 278 |     await page.getByRole('button', { name: /Next/i }).click();
      |                                                       ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: /Next/i }) resolved to 2 elements:
  279 |     await page.waitForTimeout(500);
  280 | 
  281 |     // Step 2: Select Curriculum
  282 |     const syCombobox = page.getByRole('combobox', { name: /select school year/i });
  283 |     if (await syCombobox.isVisible().catch(() => false) || await page.locator('#schoolYearId').isVisible().catch(() => false)) {
  284 |       await syCombobox.click().catch(() => page.locator('#schoolYearId').click());
  285 |       await page.waitForTimeout(200);
  286 |       await page.getByRole('option').nth(0).click().catch(() => {});
  287 |       await page.waitForTimeout(500);
  288 |       const curriculumBtn = page.locator('button', { hasText: 'Curriculum' }).first();
  289 |       if (await curriculumBtn.isVisible()) {
  290 |         await curriculumBtn.click();
  291 |       }
  292 |     }
  293 |     
  294 |     // We can't guarantee 'Next' is enabled if no curriculum is available, so we check
  295 |     const nextBtn2 = page.getByRole('button', { name: /Next/i });
  296 |     if (await nextBtn2.isEnabled()) {
  297 |       await nextBtn2.click();
  298 |       await page.waitForTimeout(500);
  299 | 
  300 |       // Step 3: Subjects
  301 |       const nextBtn3 = page.getByRole('button', { name: /Next/i });
  302 |       if (await nextBtn3.isEnabled()) await nextBtn3.click();
  303 |       await page.waitForTimeout(500);
  304 | 
  305 |       // Step 4: Section
  306 |       const nextBtn4 = page.getByRole('button', { name: /Next/i });
  307 |       if (await nextBtn4.isEnabled()) await nextBtn4.click();
  308 |       await page.waitForTimeout(500);
  309 | 
  310 |       // Step 5: Confirm
  311 |       const confirmBtn = page.getByRole('button', { name: /Confirm Enrollment/i });
  312 |       if (await confirmBtn.isVisible()) {
  313 |         await confirmBtn.click();
  314 |         console.log('✅ SIS: Enrollment wizard completed');
  315 |       }
  316 |     } else {
  317 |       console.log('ℹ️ SIS: Enrollment wizard could not proceed (missing curriculum)');
  318 |     }
  319 |   });
  320 | 
  321 |   test('5. Facility: Buildings Form', async ({ page }) => {
  322 |     await page.goto(`${BASE}/facility/buildings`);
  323 |     await page.waitForLoadState('networkidle');
  324 |     await expect(page.locator('h1')).toContainText('Buildings');
  325 | 
  326 |     await page.getByRole('button', { name: /Add Building/i }).click();
  327 |     const dialog = page.locator('[role="dialog"]');
  328 |     await expect(dialog.getByRole('heading', { name: /Create Building/i })).toBeVisible();
  329 | 
  330 |     const tag = uid();
  331 |     await page.fill('#name', `Science Hall ${tag}`);
  332 |     await page.fill('#code', `SH-${tag.toUpperCase().slice(0, 4)}`);
  333 | 
  334 |     // The form requires a Tenant (Branch stays disabled until one is picked).
  335 |     // Radix triggers have no id here, so scope comboboxes to the dialog;
  336 |     // SelectContent options render in a body-level portal, so they are page-scoped.
  337 |     // Pick "Demo School" — the admin's own tenant — falling back to the first
  338 |     // option for other seed states.
  339 |     const tenantTrigger = dialog.locator('button[role="combobox"]').first();
  340 |     await tenantTrigger.click();
  341 |     const demoOption = page.locator('[role="option"]', { hasText: /Demo School/i });
  342 |     if (await demoOption.isVisible({ timeout: 3000 }).catch(() => false)) {
  343 |       await demoOption.first().click();
  344 |     } else {
  345 |       await page.locator('[role="option"]').first().click();
  346 |     }
  347 | 
  348 |     const branchTrigger = dialog.locator('button[role="combobox"]').nth(1);
  349 |     if ((await branchTrigger.isVisible()) && (await branchTrigger.isEnabled())) {
  350 |       await branchTrigger.click();
  351 |       await page
  352 |         .locator('[role="option"]')
  353 |         .first()
  354 |         .click();
  355 |     }
  356 | 
  357 |     await dialog.getByRole('button', { name: /Create$/i }).click();
  358 |     await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  359 |     console.log('✅ Facility: Building created via form');
  360 |   });
  361 | 
  362 |   test('5.1. Facility: Floors Form', async ({ page }) => {
  363 |     await page.goto(`${BASE}/facility/floors`);
  364 |     await page.waitForLoadState('networkidle');
  365 |     await expect(page.locator('h1')).toContainText('Floors');
  366 | 
  367 |     const firstBuilding = page.locator('a[href*="/facility/buildings/"]').first();
  368 |     if (await firstBuilding.isVisible()) {
  369 |       await firstBuilding.click();
  370 |       await page.waitForLoadState('networkidle');
  371 | 
  372 |       await page.getByRole('button', { name: /Add Floor/i }).click();
  373 |       const dialog = page.locator('[role="dialog"]');
  374 |       await expect(dialog.getByRole('heading', { name: /Create Floor/i })).toBeVisible();
  375 | 
  376 |       const tag = uid();
  377 |       const floorNum = Math.floor(Math.random() * 1000) + 10; // Avoid 1-10 which might exist
  378 |       await page.fill('#label', `Floor ${tag}`);
```