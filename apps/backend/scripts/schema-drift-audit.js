#!/usr/bin/env node
/**
 * Schema drift audit — does the database still match the entities?
 *
 * The entity metadata is the application's source of truth. This asks TypeORM's
 * schema builder to diff the entities against a live database and fails if
 * anything would have to change, which is the same computation `synchronize`
 * performs — except it reports instead of altering.
 *
 * Usage (from apps/backend):
 *   node scripts/schema-drift-audit.js                       # audits .env DB_NAME
 *   node scripts/schema-drift-audit.js --database sms_schema_migrations
 *   node scripts/schema-drift-audit.js --verbose             # print every statement
 *
 * Run it after applying migrations to a scratch database to prove the migration
 * set still produces the schema the entities expect:
 *
 *   createdb sms_schema_migrations
 *   for f in src/migrations/*.sql; do psql -d sms_schema_migrations -f "$f"; done
 *   node scripts/schema-drift-audit.js --database sms_schema_migrations
 *
 * Exit codes: 0 = no drift, 1 = drift (or an error).
 */
const path = require('path');
const { DataSource } = require('typeorm');
const { dbConfig, root } = require('./lib/env');

const connection = dbConfig();

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const database = valueOf('--database') || connection.database;
const verbose = args.includes('--verbose');

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    ...connection,
    database,
    entities: [path.join(root, 'dist/**/*.entity.js')],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();

  let failed = false;
  try {
    console.log(`Schema drift audit — database "${database}"`);

    // --- 1. Columns the database has to change -----------------------------
    const { upQueries, downQueries } = await ds.driver.createSchemaBuilder().log();
    const statements = upQueries.map((q) => q.query).filter(Boolean);

    if (statements.length === 0) {
      console.log('OK: schema matches the entity metadata');
    } else {
      failed = true;
      console.log(`DRIFT: ${statements.length} statement(s) would be needed to match the entities`);
      const shown = verbose ? statements : statements.slice(0, 25);
      for (const s of shown) console.log(`  - ${s}`);
      if (!verbose && statements.length > shown.length) {
        console.log(`  … ${statements.length - shown.length} more (use --verbose)`);
      }
      if (downQueries.length > 0) {
        console.log(`  (TypeORM would also emit ${downQueries.length} drop statement(s))`);
      }
      console.log(
        '\n  Fix by either:\n' +
          '    - regenerating the baseline: npm run schema:generate\n' +
          '    - or adding a migration that converges the database\n' +
          '  Never hand-edit src/migrations/000-create-all-tables.sql (generated).',
      );
    }

    // --- 2. Columns declared uuid that do not hold an identifier -----------
    // The original source of this drift: a copy-paste `type: 'uuid'` on fields
    // that hold numbers or labels, which then fails at insert/query time
    // ("invalid input syntax for type uuid", "column x is of type uuid but
    // expression is of type integer").
    const suspects = [];
    for (const meta of ds.entityMetadatas) {
      for (const column of meta.columns) {
        // Skip join columns: a @ManyToOne property is named after the relation
        // (e.g. `tenant`) but holds the referenced uuid.
        if (column.relationMetadata) continue;
        const declaredUuid = String(column.type).toLowerCase() === 'uuid' && !column.isArray;
        if (!declaredUuid) continue;
        const name = column.propertyName;
        if (/Id(s)?$/.test(name) || /By$/.test(name) || name === 'id') continue;
        suspects.push(`${meta.tableName}.${name}`);
      }
    }
    if (suspects.length === 0) {
      console.log('OK: no uuid-typed columns that look like non-identifiers');
    } else {
      failed = true;
      console.log(`SUSPECT: ${suspects.length} uuid column(s) that do not look like identifiers`);
      for (const s of suspects.sort()) console.log(`  - ${s}`);
      console.log('  (uuid is a valid choice for an id reference — review each of these)');
    }
  } finally {
    await ds.destroy();
  }

  if (failed) {
    console.log('\nFAIL: schema drift detected.');
    process.exit(1);
  }
  console.log('\nPASS: entities and database agree.');
}

main().catch((err) => {
  console.error(`schema-drift-audit failed: ${err.message || err}`);
  process.exit(1);
});
