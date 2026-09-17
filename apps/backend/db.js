const { Pool } = require('pg');

const pool = new Pool({
  user: 'kpagarigan2',
  host: 'localhost',
  database: 'sms',
  password: 'P@ssw0rd',
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
