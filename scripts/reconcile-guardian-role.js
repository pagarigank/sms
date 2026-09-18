const { Client } = require(require.resolve('pg', { paths: ['d:/sms/apps/backend'] }));
const client = new Client({
  host: 'localhost',
  user: 'kpagarigan2',
  password: 'P@ssw0rd',
  database: 'sms',
  port: 5432,
});

async function main() {
  await client.connect();
  const userId = '40000000-0000-0000-0000-000000000004';
  const roleId = 'b0000000-0000-0000-0000-000000000011'; // Guardian role
  const tenantId = '10000000-0000-0000-0000-000000000001';
  const guardianId = '99000000-0000-0000-0000-000000000001';

  // 1. Assign Guardian role in user_roles
  await client.query(`
    INSERT INTO user_roles ("userId", "roleId", "tenantId")
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING;
  `, [userId, roleId, tenantId]);
  console.log('user_roles for guardian reconciled.');

  // 2. Insert user_person_link
  await client.query(`
    INSERT INTO user_person_links ("id", "tenantId", "userId", "personType", "personId")
    VALUES (gen_random_uuid(), $1, $2, 'guardian', $3)
    ON CONFLICT DO NOTHING;
  `, [tenantId, userId, guardianId]);
  console.log('user_person_links for guardian reconciled.');

  // Check
  const check = await client.query(`
    SELECT u.email, r.name as role 
    FROM users u 
    JOIN user_roles ur ON u.id = ur."userId" 
    JOIN roles r ON ur."roleId" = r.id 
    WHERE u.id = $1;
  `, [userId]);
  console.log('Guardian roles:', check.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
