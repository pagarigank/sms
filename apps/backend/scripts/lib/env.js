/**
 * Minimal .env loader for the standalone schema scripts.
 *
 * `dotenv` is not a direct dependency here (it only reaches the app through
 * @nestjs/config's own copy), and requiring it silently yielded no config —
 * which meant these scripts ignored a real .env and fell back to the built-in
 * development defaults. Parse the file ourselves instead: no new dependency,
 * no silent failure.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');

function loadEnv() {
  for (const name of ['.env.development', '.env']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Real environment variables win, matching dotenv's behaviour.
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/**
 * Connection settings, in both the names TypeORM expects (`username`) and the
 * names `pg` expects (`user`) — pg ignores `username` and would otherwise
 * connect as the OS user.
 */
function dbConfig() {
  loadEnv();
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USERNAME || 'kpagarigan2';
  const password = process.env.DB_PASSWORD || 'P@ssw0rd';
  const database = process.env.DB_NAME || 'sms';
  return {
    host,
    port,
    user,
    password,
    database,
    // TypeORM spellings
    username: user,
  };
}

module.exports = { loadEnv, dbConfig, root };
