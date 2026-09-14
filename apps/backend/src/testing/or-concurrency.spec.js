/**
 * BIR OR-numbering concurrency audit (Phase 11.2).
 *
 * Fires N concurrent allocateOrNumber-equivalent transactions against the
 * live DB and asserts: zero duplicates (and reports the allocated span).
 * Exercises exactly the migration-012 pattern: unique scope index +
 * INSERT ... ON CONFLICT DO NOTHING + SELECT ... FOR UPDATE + UPDATE,
 * mirroring CashieringService.allocateOrNumber.
 *
 * Run: node src/testing/or-concurrency.spec.js
 */
const { Client } = require('pg');

const CFG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'kpagarigan2',
  password: process.env.DB_PASSWORD || 'P@ssw0rd',
  database: process.env.DB_NAME || 'sms',
};

const TENANT = '10000000-0000-0000-0000-000000000001';
const BRANCH = '20000000-0000-0000-0000-000000000001';
const CONCURRENCY = 20;

async function allocateOne() {
  const c = new Client(CFG);
  await c.connect();
  try {
    await c.query('BEGIN');
    // Active series for branch (same as service)
    const series = await c.query(
      `SELECT id, "rangeStart", "rangeEnd" FROM atp_series
       WHERE "tenantId"=$1 AND "branchId"=$2 AND "isActive"=true
       ORDER BY "createdAt" DESC LIMIT 1`,
      [TENANT, BRANCH],
    );
    const s = series.rows[0];
    if (!s) throw new Error('no active ATP series');

    // Atomic get-or-create (unique scope index) then row-lock
    await c.query(
      `INSERT INTO series_counters ("id","tenantId","branchId","atpSeriesId","counterValue")
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       ON CONFLICT ("tenantId","branchId","atpSeriesId") DO NOTHING`,
      [TENANT, BRANCH, s.id, Number(s.rangeStart) - 1],
    );
    const locked = await c.query(
      `SELECT "counterValue" FROM series_counters
       WHERE "tenantId"=$1 AND "branchId"=$2 AND "atpSeriesId"=$3
       FOR UPDATE`,
      [TENANT, BRANCH, s.id],
    );
    const nextValue = Number(locked.rows[0].counterValue) + 1;
    if (nextValue > Number(s.rangeEnd)) throw new Error('series exhausted');

    await c.query(
      `UPDATE series_counters SET "counterValue"=$1
       WHERE "tenantId"=$2 AND "branchId"=$3 AND "atpSeriesId"=$4`,
      [nextValue, TENANT, BRANCH, s.id],
    );
    await c.query('COMMIT');
    return nextValue;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

(async () => {
  // Ensure a clean starting counter for a deterministic assertion
  const setup = new Client(CFG);
  await setup.connect();
  const series = await setup.query(
    `SELECT id, "rangeStart" FROM atp_series
     WHERE "tenantId"=$1 AND "branchId"=$2 AND "isActive"=true
     ORDER BY "createdAt" DESC LIMIT 1`,
    [TENANT, BRANCH],
  );
  const s = series.rows[0];
  if (!s) { console.error('FAIL: no active ATP series — run migration 009'); process.exit(1); }
  await setup.query(
    `DELETE FROM series_counters WHERE "tenantId"=$1 AND "branchId"=$2 AND "atpSeriesId"=$3`,
    [TENANT, BRANCH, s.id],
  );
  await setup.end();

  // Fire N concurrent allocations
  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENCY }, () => allocateOne()),
  );

  const allocated = [];
  let errors = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') allocated.push(r.value);
    else { errors++; console.error('allocation error:', r.reason?.message); }
  }

  const duplicates = allocated.length - new Set(allocated).size;
  const min = Math.min(...allocated);
  const max = Math.max(...allocated);
  const span = max - min + 1;
  const gapless = allocated.length === span; // contiguous block implies no gaps

  console.log(`allocated=${allocated.length} errors=${errors}`);
  console.log(`duplicates=${duplicates} (must be 0)`);
  console.log(`range=${min}..${max} contiguous=${gapless ? 'yes' : 'no — gaps/interleaving possible'}`);

  if (duplicates > 0) {
    console.error('FAIL: duplicate OR numbers under concurrency — BIR violation');
    process.exit(1);
  }
  console.log('PASS: zero duplicate OR numbers under concurrency');
  process.exit(0);
})().catch((e) => {
  console.error('Suite error:', e.message);
  process.exit(1);
});
