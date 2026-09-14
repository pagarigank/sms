/*eslint-env node*/
// One-shot contract audit:
//  A) portal apiClient.<mod>.<method> vs api-client module methods
//  B) api-client (verb, path) vs registered Nest routes
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const walk = (dir, ext, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
};
const read = (p) => fs.readFileSync(p, 'utf8');

// ---------- A) portal calls vs api-client modules ----------
const clientSrc = 'packages/api-client/src';
const moduleMap = {}; // mod -> Set(methods)
for (const f of walk(clientSrc, '.ts')) {
  const src = read(f);
  // match either style, ALL blocks per file:
  //   const xEndpoints = (client) => ({ ... });
  //   export function xEndpoints(client: ApiClient) { return { ... }; }
  const blocks = [];
  let m;
  const constRe = /const\s+(\w+)Endpoints\s*=\s*\([^)]*\)\s*=>\s*\(\{([\s\S]*?)\n\}\)/g;
  while ((m = constRe.exec(src))) blocks.push(m);
  const fnRe = /function\s+(\w+)Endpoints\s*\([^)]*\)\s*\{\s*return\s*\{([\s\S]*?)\n  \};/g;
  while ((m = fnRe.exec(src))) blocks.push(m);
  for (m of blocks) {
    const mod = m[1].replace(/Endpoints$/, '');
    const methods = new Set();
    const re = /(?:^|\n)\s*([a-zA-Z0-9_]+)\s*:/g;
    let mm;
    while ((mm = re.exec(m[2]))) methods.add(mm[1]);
    if (!moduleMap[mod]) moduleMap[mod] = new Set();
    for (const x of methods) moduleMap[mod].add(x);
  }
}
// special merges: ApiClient property names differ from endpoint fn names
const propAlias = {
  branches: 'branch',
  tenants: 'tenant',
  users: 'user',
  departments: 'department',
  invoices: 'invoice',
  // grading merges gradingEndpoints + gradingExtendedEndpoints
  grading: 'grading',
};
if (moduleMap.gradingExtended) moduleMap.gradingExtended.forEach((x) => moduleMap.grading.add(x));
for (const [prop, fn] of Object.entries(propAlias)) {
  if (moduleMap[fn] && prop !== fn) {
    moduleMap[prop] = new Set(moduleMap[fn]);
  }
}

const portalFiles = [
  ...walk('apps/school-portal/src', '.tsx'),
  ...walk('apps/school-portal/src', '.ts'),
  ...walk('apps/platform-admin/src', '.tsx'),
  ...walk('apps/platform-admin/src', '.ts'),
  ...walk('apps/guardian-portal/src', '.tsx'),
  ...walk('apps/platform-admin/src', '.ts'),
];
const callRe = /apiClient\.(\w+)\.(\w+)/g;
const missing = new Map();
for (const f of portalFiles) {
  const src = read(f);
  let m;
  while ((m = callRe.exec(src))) {
    const [, mod, method] = m;
    const pool = moduleMap[mod];
    if (!pool) {
      const k = `${mod}.${method} (module '${mod}' not found)`;
      if (!missing.has(k)) missing.set(k, []);
      missing.get(k).push(f);
    } else if (!pool.has(method)) {
      const k = `${mod}.${method} (method not found)`;
      if (!missing.has(k)) missing.set(k, []);
      missing.get(k).push(f);
    }
  }
}
console.log('=== A) PORTAL -> API-CLIENT ===');
if (missing.size === 0) console.log('OK: every portal apiClient.* call resolves to a real api-client method');
else for (const [k, files] of missing) console.log('MISSING:', k, '->', [...new Set(files)].join(', '));

// ---------- B) api-client paths vs backend routes ----------
const backendFiles = walk('apps/backend/src', '.ts').filter((f) => !f.includes('.spec.') && !f.includes('__tests__'));
const routes = []; // {path, file, kind: 'Controller'|'Method'}
for (const f of backendFiles) {
  const src = read(f);
  const ctrl = src.match(/@Controller\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  if (!ctrl) continue;
  const base = ctrl[1].replace(/^\//, '');
  const re = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    routes.push({ verb: m[1].toUpperCase(), sub: (m[2] || '').replace(/^\//, ''), base, file: f });
  }
}
const routeSet = new Set(routes.map((r) => `${r.verb} /${r.base}/${r.sub}`.replace(/\/+$/, '/')));

const epFiles = walk(clientSrc, '.ts');
const clientCalls = [];
for (const f of epFiles) {
  const src = read(f);
  const re = /client\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = re.exec(src))) {
    clientCalls.push({ verb: m[1].toUpperCase(), tpl: m[2], file: f });
  }
}
const norm = (tpl) =>
  tpl
    .replace(/\?[^`]*/, '') // strip embedded query strings
    .replace(/^\//, '')
    .replace(/\$\{[^}]+\}/g, ':p') // ${id} -> :p
    .replace(/:p\/:p/g, ':p/:p');
function matches(routePath, callPath) {
  const r = routePath.split('/');
  const c = callPath.split('/');
  if (r.length !== c.length) return false;
  return r.every((seg, i) => (seg.startsWith(':') || seg === ':p') === (c[i].startsWith(':') || c[i] === ':p') && (seg.startsWith(':') || seg === ':p' || seg === c[i]));
}
const unmatched = [];
for (const c of clientCalls) {
  const callPath = norm(c.tpl);
  if (!callPath.startsWith('api/')) { unmatched.push({ ...c, why: 'no /api prefix: ' + c.tpl }); continue; }
  const rel = '/' + callPath.replace(/^api\/v1\//, '');
  const hit = routes.some((r) => r.verb === c.verb && matches(`/${r.base}/${r.sub}`.replace(/\/+$/, ''), rel));
  if (!hit) unmatched.push({ ...c, why: 'no matching backend route' });
}
console.log('\n=== B) API-CLIENT -> BACKEND ===');
if (unmatched.length === 0) console.log('OK: every api-client call path matches a registered backend route');
else for (const u of unmatched) console.log('UNMATCHED:', u.verb, u.tpl, '-', u.why, '->', u.file);

// ---------- exit code for CI ----------
const drift = missing.size + unmatched.length;
if (drift > 0) {
  console.log(`\nFAIL: ${drift} contract drift item(s) — portal→client→backend contract is broken.`);
  process.exitCode = 1;
} else {
  console.log('\nPASS: portal→api-client→backend contract is intact.');
}
