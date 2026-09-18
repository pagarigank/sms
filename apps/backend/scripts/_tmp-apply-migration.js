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
  const sql = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'migrations', file), 'utf8');
  const r = await c.query(sql);
  console.log('APPLIED', file, 'updated', r.rowCount);
  const counts = await c.query(`SELECT 'grading_systems' AS tbl, count(*) FROM grading_systems UNION ALL SELECT 'grade_components', count(*) FROM grade_components UNION ALL SELECT 'honor_roll_configs', count(*) FROM honor_roll_configs UNION ALL SELECT 'grade_entries', count(*) FROM grade_entries UNION ALL SELECT 'grade_change_requests', count(*) FROM grade_change_requests`);
  console.log(JSON.stringify(counts.rows, null, 1));
  const sys = await c.query(`SELECT id, education_level_id, type, name FROM grading_systems order by id`);
  console.log(JSON.stringify(sys.rows, null, 1));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });