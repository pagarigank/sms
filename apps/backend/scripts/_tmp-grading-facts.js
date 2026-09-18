const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .split(/\r?\n/)
  .filter(l => l && !l.trim().startsWith('#'))
  .reduce((acc, l) => { const [k, ...v] = l.split('='); acc[k.trim()] = v.join('=').trim(); return acc; }, {});

(async () => {
  const c = new Client({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USERNAME || 'kpagarigan2',
    password: env.DB_PASSWORD || 'P@ssw0rd',
    database: env.DB_NAME || 'sms',
  });
  await c.connect();
  const file = process.argv[2];
  if (file) {
    const sql = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
    const r = await c.query(sql);
    console.log(JSON.stringify(r.rows, null, 2));
  } else {
    const t = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('grading_systems','grade_components','grade_entries','honor_roll_configs','grade_change_requests') ORDER BY table_name`);
    console.log('GRADING TABLES', JSON.stringify(t.rows));
    const p = await c.query(`SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('grading_systems','grade_components','grade_entries','honor_roll_configs','grade_change_requests')`);
    console.log('POLICIES', JSON.stringify(p.rows));
    const rls = await c.query(`SELECT relname AS table_name, relrowsecurity FROM pg_class WHERE relname IN ('grading_systems','grade_components','grade_entries','honor_roll_configs','grade_change_requests')`);
    console.log('RLS', JSON.stringify(rls.rows));
    const cols = await c.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='grade_change_requests' ORDER BY ordinal_position`);
    console.log('GCR COLS', JSON.stringify(cols.rows, null, 1));
    const idx = await c.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='grading_systems'`);
    console.log('GRADING SYSTEM INDEXES', JSON.stringify(idx.rows, null, 1));
    const schemas = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%grading%' OR table_name LIKE '%grade%') ORDER BY table_name`);
    console.log('ALL GRADE TABLES', JSON.stringify(schemas.rows));
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });