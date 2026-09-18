const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', user: 'kpagarigan2', password: 'P@ssw0rd', database: 'sms' });
  await client.connect();
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%audit%'`);
  console.log('AUDIT TABLES', JSON.stringify(tables.rows, null, 1));
  if (tables.rows.length) {
    const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [tables.rows[0].table_name]);
    console.log('AUDIT COLS', JSON.stringify(cols.rows, null, 1));
  }
  const gcr = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='grade_change_requests' AND column_name IN ('old_score','new_score','approved_by_user_id')`);
  console.log('STALE GCR COLS', JSON.stringify(gcr.rows, null, 1));
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });