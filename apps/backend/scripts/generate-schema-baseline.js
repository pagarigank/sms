#!/usr/bin/env node
/**
 * Generate the entity-accurate schema baseline for this backend.
 *
 * The `migrations/*.sql` files were written against a schema that TypeORM
 * `synchronize` had already created, so their hand-written DDL drifted from the
 * entities (snake_case columns, missing tables). This script derives the DDL
 * from the entity metadata itself — the application's source of truth — and
 * makes every statement idempotent so it is safe to re-run against a database
 * that already has the tables.
 *
 * Usage (from apps/backend) — needs a build, because it reads dist/*.entity.js:
 *   npm run schema:generate
 *
 *   # or explicitly
 *   npm run build && node scripts/generate-schema-baseline.js \
 *     --template scripts/schema-baseline.template.sql \
 *     --out src/migrations/000-create-all-tables.sql
 *
 *   # Just the DDL, to stdout
 *   node scripts/generate-schema-baseline.js
 *   node scripts/generate-schema-baseline.js --raw > ddl.sql
 *
 * The builder diffs entity metadata against a database, so it needs an EMPTY
 * one — DB_NAME_SCRATCH (default `sms_schema_scratch`). It is created on demand
 * if it does not exist.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { DataSource } = require('typeorm');
const { dbConfig, root } = require('./lib/env');

// Reuse the app's .env so connection settings can't drift from runtime.
const connection = dbConfig();

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const outFile = valueOf('--out');
const templateFile = valueOf('--template');
const raw = args.includes('--raw');
const marker = '-- @@ENTITY_DDL@@';

const scratchDb = process.env.DB_NAME_SCRATCH || 'sms_schema_scratch';

/** Wrap a statement so re-running it on an existing schema is a no-op. */
function makeIdempotent(sql) {
  const statement = sql.trim().replace(/;$/, '');

  // CREATE TABLE "x" ( ... ) → CREATE TABLE IF NOT EXISTS "x" ( ... )
  if (/^CREATE TABLE (?!IF NOT EXISTS)/i.test(statement)) {
    return `${statement.replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ')};`;
  }

  // Enum types: the only failure mode we care about is "already exists".
  if (/^CREATE TYPE /i.test(statement)) {
    return `DO $$\nBEGIN\n  ${statement};\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`;
  }

  // Deferred constraints (cycles / FKs added after the tables) fail with 42710
  // on a second run.
  if (/^ALTER TABLE .* ADD CONSTRAINT /i.test(statement)) {
    return `DO $$\nBEGIN\n  ${statement};\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`;
  }

  if (/^CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/i.test(statement)) {
    return `${statement.replace(/^CREATE (UNIQUE )?INDEX /i, (m) => `${m}IF NOT EXISTS `)};`;
  }

  return `${statement};`;
}

/** The scratch database must exist; create it if it does not. */
async function ensureScratchDatabase() {
  const admin = new Client({ ...connection, database: 'postgres' });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      scratchDb,
    ]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE "${scratchDb}"`);
      console.error(`created scratch database "${scratchDb}"`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  await ensureScratchDatabase();

  const ds = new DataSource({
    type: 'postgres',
    ...connection,
    database: scratchDb,
    entities: [path.join(root, 'dist/**/*.entity.js')],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  try {
    const { upQueries } = await ds.driver.createSchemaBuilder().log();
    const statements = upQueries.map((q) => q.query).filter(Boolean);
    if (statements.length === 0) {
      throw new Error(
        `No statements generated — "${scratchDb}" is not empty. The builder diffs ` +
          'entity metadata against that database, so it must be empty.',
      );
    }

    const ddl = raw
      ? statements.map((s) => (s.trim().endsWith(';') ? s : `${s};`)).join('\n\n')
      : statements.map(makeIdempotent).join('\n\n');

    if (templateFile) {
      const template = fs.readFileSync(path.resolve(templateFile), 'utf8');
      if (!template.includes(marker)) {
        throw new Error(`Template ${templateFile} is missing the "${marker}" marker`);
      }
      if (!outFile) {
        throw new Error('--template requires --out');
      }
      const composed = template.split(marker).join(ddl);
      fs.writeFileSync(path.resolve(outFile), composed);
      console.error(
        `wrote ${statements.length} statements into ${outFile} (from ${templateFile})`,
      );
      return;
    }

    const header = [
      '-- ============================================================',
      '-- GENERATED FILE — do not edit by hand.',
      '--',
      '-- Entity-accurate Postgres schema for every @Entity in this backend.',
      '-- Regenerate with the command documented in schema-baseline.template.sql',
      `-- (generated against an empty "${scratchDb}" database)`,
      '--',
      `-- Statements: ${statements.length}`,
      '-- ============================================================',
      '',
    ].join('\n');

    const output = `${header}${ddl}\n`;
    if (outFile) {
      fs.writeFileSync(path.resolve(outFile), output);
      console.error(`wrote ${statements.length} statements to ${outFile}`);
    } else {
      process.stdout.write(output);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
