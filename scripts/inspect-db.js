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
  const users = await client.query(`
    SELECT u.id, u.email, u.status, u."tenantId", u."passwordHash" IS NOT NULL as has_pass, r.name as role 
    FROM users u 
    LEFT JOIN user_roles ur ON u.id = ur."userId" 
    LEFT JOIN roles r ON ur."roleId" = r.id
    ORDER BY u.email;
  `);
  const u = await client.query(`
    SELECT u.id, u.email, upl."personType", upl."personId", r.name as role 
    FROM users u 
    LEFT JOIN user_person_links upl ON u.id = upl."userId" 
    LEFT JOIN user_roles ur ON u.id = ur."userId" 
    LEFT JOIN roles r ON ur."roleId" = r.id 
    WHERE u.email LIKE 'faculty.e2e.%' 
    ORDER BY u."createdAt" DESC 
    LIMIT 2;
  `);
  console.log('LATEST USERS:', u.rows);

  const tl = await client.query(`SELECT * FROM teaching_loads LIMIT 5;`);
  console.log('TEACHING LOADS:');
  console.log(tl.rows);

  const cl = await client.query(`SELECT id, name, "facultyId", "courseId", "sectionId" FROM classes LIMIT 5;`);
  console.log('CLASSES:');
  console.log(cl.rows);

  const guardians = await client.query(`SELECT id, "firstName", "lastName", "tenantId" FROM guardians;`);
  console.log('GUARDIANS:');
  console.log(guardians.rows);

  const emp = await client.query(`SELECT id, "firstName", "lastName", email, position, "tenantId" FROM employees;`);
  console.log('EMPLOYEES:');
  console.log(emp.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
