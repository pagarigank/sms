# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\e2e-admin-forms.spec.ts >> Admin E2E — All Modules via Forms Only >> 4.1. SIS: Admissions Application wizard
- Location: e2e\e2e-admin-forms.spec.ts:201:7

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('option', { name: /male/i }) resolved to 2 elements:
    1) <div role="option" tabindex="-1" data-highlighted="" aria-selected="false" data-state="unchecked" aria-labelledby="radix-_r_8_" data-radix-collection-item="" class="relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm text-[hsl(var(--ink-100))] outline-none transition-colors duration-100 focus:bg-[hsl(var(--accent)/0.15)] focus:text-[hsl(var(--ink-100))] data-[disabled]:pointer-events-none data-[disabled]:opacity-40">…</div> aka getByRole('option', { name: 'Male', exact: true })
    2) <div role="option" tabindex="-1" aria-selected="false" data-state="unchecked" aria-labelledby="radix-_r_9_" data-radix-collection-item="" class="relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm text-[hsl(var(--ink-100))] outline-none transition-colors duration-100 focus:bg-[hsl(var(--accent)/0.15)] focus:text-[hsl(var(--ink-100))] data-[disabled]:pointer-events-none data-[disabled]:opacity-40">…</div> aka getByRole('option', { name: 'Female' })

Call log:
  - waiting for getByRole('option', { name: /male/i })

```

# Page snapshot

```yaml
- generic:
  - generic [aria-hidden]:
    - generic:
      - generic:
        - generic:
          - link:
            - /url: /dashboard
            - generic:
              - generic:
                - text: SchoolSuite
                - generic: SMS
        - navigation:
          - paragraph: Overview
          - generic:
            - link:
              - /url: /dashboard
              - generic: Dashboard
          - paragraph: People & Campus
          - generic:
            - link:
              - /url: /sis
              - generic: SIS
            - generic:
              - link:
                - /url: /sis/students
                - text: Students
              - link:
                - /url: /sis/guardians
                - text: Guardians
              - link:
                - /url: /sis/enrollments
                - text: Enrollments
              - link:
                - /url: /sis/sections
                - text: Sections
              - link:
                - /url: /sis/admissions
                - text: Admissions
          - generic:
            - link:
              - /url: /facility
              - generic: Facility
          - generic:
            - link:
              - /url: /departments
              - generic: Departments
          - generic:
            - link:
              - /url: /hr
              - generic: HR
          - paragraph: Academic
          - generic:
            - link:
              - /url: /academic
              - generic: Academic Setup
          - generic:
            - link:
              - /url: /scheduling
              - generic: Scheduling
          - generic:
            - link:
              - /url: /scheduling/gradebook
              - generic: Gradebook
          - generic:
            - link:
              - /url: /grading
              - generic: Grading Config
          - paragraph: Finance
          - generic:
            - link:
              - /url: /billing
              - generic: Billing
          - generic:
            - link:
              - /url: /cashiering
              - generic: Cashiering
          - paragraph: System
          - generic:
            - link:
              - /url: /communications
              - generic: Communications
          - generic:
            - link:
              - /url: /documents
              - generic: Documents
          - generic:
            - link:
              - /url: /iam
              - generic: Users & Roles
          - generic:
            - link:
              - /url: /reports
              - generic: Reports
          - generic:
            - link:
              - /url: /settings
              - generic: Settings
        - generic:
          - generic:
            - generic: A
            - generic:
              - paragraph: admin@demo-school.ph
              - paragraph: School Staff
      - generic:
        - banner:
          - generic:
            - generic:
              - combobox:
                - generic: My Tenant
              - combobox:
                - generic: Main Campus
          - generic:
            - button:
              - generic: A
              - generic: admin@demo-school.ph
        - main:
          - generic:
            - generic:
              - generic:
                - heading [level=1]: Student Application
                - paragraph: Complete the form below to apply for enrollment
              - generic:
                - generic:
                  - generic: Student Info
                  - generic: Academic
                  - generic: Guardian
                  - generic: Documents
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - heading [level=2]: Personal Details
                      - paragraph: Provide the applicant's basic personal information.
                    - generic:
                      - generic:
                        - generic: First Name *
                        - textbox: AppFirst_bgfity
                      - generic:
                        - text: Middle Name
                        - textbox
                      - generic:
                        - generic: Last Name *
                        - textbox: AppLast_bgfity
                      - generic:
                        - text: Suffix
                        - textbox:
                          - /placeholder: Jr., III
                      - generic:
                        - generic: Birth Date *
                        - textbox: 2010-05-10
                      - generic:
                        - generic: Sex *
                        - combobox [expanded]:
                          - generic: Select sex
                      - generic:
                        - generic: Address *
                        - textbox:
                          - /placeholder: Full residential address
                      - generic:
                        - text: Phone Number
                        - textbox:
                          - /placeholder: +63 900 000 0000
                      - generic:
                        - text: Email Address
                        - textbox:
                          - /placeholder: student@example.com
                - generic:
                  - button [disabled]: Back
                  - button [disabled]: Next
  - region "Notifications"
  - button "Open Next.js Dev Tools" [ref=f1e6] [cursor=pointer]
  - alert
  - listbox [ref=f1e10]:
    - option "Male" [active] [ref=f1e11]
    - option "Female" [ref=f1e14]
```

# Test source

```ts
  114 |     await page.waitForLoadState('networkidle');
  115 |     await expect(page.locator('h1')).toContainText('Grade Levels');
  116 | 
  117 |     await page.getByRole('button', { name: /Add Grade Level|Create Grade Level/i }).first().click();
  118 |     const dialog = page.locator('[role="dialog"]');
  119 |     await expect(dialog.getByRole('heading', { name: /Create Grade Level/i })).toBeVisible();
  120 | 
  121 |     // Select Education Level
  122 |     const edLevelTrigger = dialog.locator('button[role="combobox"]').first();
  123 |     if (await edLevelTrigger.isVisible()) {
  124 |       await edLevelTrigger.click();
  125 |       await page.waitForTimeout(200);
  126 |       const options = page.locator('[role="option"]');
  127 |       if ((await options.count()) > 0) {
  128 |         await options.first().click();
  129 |       }
  130 |     }
  131 | 
  132 |     const tag = uid().toUpperCase();
  133 |     await page.fill('#code', `GL-${tag}`);
  134 |     await page.fill('#name', `Grade ${tag}`);
  135 |     await page.fill('#sortOrder', '10');
  136 | 
  137 |     await dialog.getByRole('button', { name: /Create$/i }).click();
  138 |     await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  139 |     console.log('✅ Academic: Grade Level created via form');
  140 |   });
  141 | 
  142 |   test('3.2. Academic: Curricula Form', async ({ page }) => {
  143 |     await page.goto(`${BASE}/academic/curricula`);
  144 |     await page.waitForLoadState('networkidle');
  145 |     await expect(page.locator('h1')).toContainText('Curricula');
  146 | 
  147 |     await page.getByRole('button', { name: /Create Curriculum/i }).first().click();
  148 |     const dialog = page.locator('[role="dialog"]');
  149 |     await expect(dialog.getByRole('heading', { name: /Create Curriculum/i })).toBeVisible();
  150 | 
  151 |     const selects = dialog.locator('button[role="combobox"]');
  152 |     // Education Level
  153 |     if (await selects.nth(0).isVisible()) {
  154 |       await selects.nth(0).click();
  155 |       await page.waitForTimeout(200);
  156 |       await page.locator('[role="option"]').first().click().catch(() => {});
  157 |     }
  158 | 
  159 |     // School Year
  160 |     if (await selects.nth(1).isVisible()) {
  161 |       await selects.nth(1).click();
  162 |       await page.waitForTimeout(200);
  163 |       await page.locator('[role="option"]').first().click().catch(() => {});
  164 |     }
  165 | 
  166 |     const tag = uid().toUpperCase();
  167 |     await page.fill('#versionLabel', `V-${tag}`);
  168 | 
  169 |     await dialog.getByRole('button', { name: /Create$/i }).click();
  170 |     await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  171 |     console.log('✅ Academic: Curriculum created via form');
  172 |   });
  173 | 
  174 |   test('4. SIS: Sections Form', async ({ page }) => {
  175 |     await page.goto(`${BASE}/sis/sections`);
  176 |     await page.waitForLoadState('networkidle');
  177 |     await expect(page.locator('h1')).toContainText('Sections');
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
> 214 |     await page.getByRole('option', { name: /male/i }).click();
      |                                                       ^ Error: locator.click: Error: strict mode violation: getByRole('option', { name: /male/i }) resolved to 2 elements:
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
  278 |     await page.getByRole('button', { name: /Next/i }).click();
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
```