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
  const userId = '50f3c3ce-0be9-4a91-86ab-82dd799b1b66'; // faculty@school-demo.ph
  const tenantId = '10000000-0000-0000-0000-000000000001'; // Demo School
  const facultyRoleId = 'b0000000-0000-0000-0000-000000000006'; // Faculty role
  const employeeId = 'd8300000-0000-0000-0000-000000000004'; // Pedro Bautista

  // 1. Update tenantId on user
  await client.query(`UPDATE users SET "tenantId" = $1 WHERE id = $2;`, [tenantId, userId]);

  // 2. Ensure user_roles in demo tenant
  await client.query(`
    INSERT INTO user_roles ("userId", "roleId", "tenantId")
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING;
  `, [userId, facultyRoleId, tenantId]);

  // 3. Link user to employee Pedro Bautista
  await client.query(`
    INSERT INTO user_person_links ("id", "tenantId", "userId", "personType", "personId")
    VALUES (gen_random_uuid(), $1, $2, 'employee', $3)
    ON CONFLICT DO NOTHING;
  `, [tenantId, userId, employeeId]);

  console.log('faculty@school-demo.ph successfully wired to Pedro Bautista in Demo School!');

  const check = await client.query(`
    SELECT u.id, u.email, u."tenantId", r.name as role, upl."personId" as employee_id
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur."userId"
    LEFT JOIN roles r ON ur."roleId" = r.id
    LEFT JOIN user_person_links upl ON u.id = upl."userId"
    WHERE u.id = $1;
  `, [userId]);
  console.log(check.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
