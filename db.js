const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sms',
  password: 'admin',
  port: 5432,
});

pool.query('SELECT email, "tenantId" FROM users;', (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.rows);
  }
  pool.end();
});
