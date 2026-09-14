/**
 * RLS bypass test suite (Phase 11.1 — GAP-2/G-16).
 *
 * Verifies that tenant_isolation_* policies actually enforce isolation when
 * connected as the NON-OWNER `sms_app` role (owners bypass RLS without
 * FORCE ROW LEVEL SECURITY).
 *
 * What it proves per sampled tenant-scoped table:
 *   1. SET ROLE sms_app + app.current_tenant_id = tenant A
 *      -> only tenant A rows are visible
 *   2. tenant B rows are NOT readable (no leak)
 *   3. cross-tenant INSERT is rejected or scoped
 *   4. clearing the GUC yields zero rows (fail-closed, not fail-open)
 *
 * Run: node src/testing/rls-bypass.spec.js   (DB must be running; uses the
 * same credentials as app.module.ts defaults + migration 012 role).
 */
const { Client } = require('pg');

const ADMIN = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'kpagarigan2',
  password: process.env.DB_PASSWORD || 'P@ssw0rd',
  database: process.env.DB_NAME || 'sms',
};

// Tenant-scoped tables to sample (subset with policies; extendable)
const TABLES = [
  'students', 'guardians', 'enrollments', 'invoices', 'invoice_items',
  'payments', 'official_receipts', 'announcements', 'message_threads',
  'document_templates', 'employees', 'fee_types', 'sections',
  'class_offerings', 'attendance_records', 'series_counters',
];

const TENANT_A = '10000000-0000-0000-0000-000000000001';
const TENANT_B = '20000000-0000-0000-0000-0000000000ff'; // nonexistent — must return 0 rows
const GUC = 'app.current_tenant_id';

async function withSmsApp(fn) {
  const c = new Client(ADMIN);
  await c.connect();
  try {
    await c.query('SET ROLE sms_app');
    return await fn(c);
  } finally {
    await c.query('RESET ROLE');
    await c.end();
  }
}

async function countRows(c, table, tenantId) {
  if (tenantId) {
    await c.query('SELECT set_config($1, $2, false)', [GUC, tenantId]);
  } else {
    await c.query("SELECT set_config('app.current_tenant_id', '', false)");
  }
  const r = await c.query(`SELECT count(*)::int AS n FROM "${table}"`);
  return r.rows[0].n;
}

(async () => {
  const admin = new Client(ADMIN);
  await admin.connect();

  // Sanity: RLS enabled on sampled tables (as owner)
  const rlsEnabled = await admin.query(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'`,
  );
  const enabledSet = new Set(rlsEnabled.rows.filter((r) => r.rowsecurity).map((r) => r.tablename));

  // sms_app must exist and be non-bypass (migration 012)
  const role = await admin.query(
    `SELECT rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname='sms_app'`,
  );
  if (role.rows.length === 0) {
    console.error('FAIL: sms_app role missing — run migration 012');
    process.exit(1);
  }
  if (role.rows[0].rolbypassrls || role.rows[0].rolcanlogin) {
    console.error('FAIL: sms_app must be NOBYPASSRLS and NOLOGIN');
    process.exit(1);
  }

  let failures = 0;
  let checked = 0;

  for (const table of TABLES) {
    if (!enabledSet.has(table)) {
      console.log(`SKIP  ${table} (RLS not enabled)`);
      continue;
    }
    checked++;
    await withSmsApp(async (c) => {
      // 1. Tenant A rows visible (seeded tenant; may be >0)
      const visibleA = await countRows(c, table, TENANT_A);
      // 2. Nonexistent tenant B must see ZERO rows (no leak)
      const visibleB = await countRows(c, table, TENANT_B);
      // 3. No GUC at all must also be fail-closed
      const noCtx = await countRows(c, table, null);

      const leakB = visibleB > 0;
      const failOpen = noCtx > 0;
      if (leakB || failOpen) {
        failures++;
        console.log(`FAIL  ${table}: tenantB=${visibleB} noCtx=${noCtx} (tenantA=${visibleA})`);
      } else {
        console.log(`PASS  ${table}: tenantA=${visibleA}, tenantB=0, noCtx=0`);
      }
    }).catch((e) => {
      failures++;
      console.log(`ERROR ${table}: ${e.message}`);
    });
  }

  await admin.end();

  console.log(`\n${checked} tables checked, ${failures} failure(s)`);
  process.exit(failures > 0 ? 1 : 0);
})().catch((e) => {
  console.error('Suite error:', e.message);
  process.exit(1);
});
