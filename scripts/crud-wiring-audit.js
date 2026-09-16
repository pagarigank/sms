/**
 * CRUD wiring audit: school-portal → api-client → backend.
 *
 * 1. Extracts every method defined on the api-client endpoint groups
 *    (handles both `export const XEndpoints = (c) => ({...})` and
 *    `export function XEndpoints(c) { return {...} }` styles).
 * 2. Extracts every `apiClient.<group>.<method>` call in school-portal.
 * 3. Reports: portal calls with no client method (broken wiring), and client
 *    methods never called by the portal (unwired backend capability).
 *
 * The group→file mapping mirrors packages/api-client/src/client.ts, since a
 * file may export several groups (billing.ts exports billing + invoices).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EP_DIR = path.join(ROOT, 'packages/api-client/src/endpoints');
const SP_DIR = path.join(ROOT, 'apps/school-portal/src');

// group name -> exported endpoint factory (mirrors client.ts composition;
// grading is a merge of two files, billing.ts exports two groups)
const GROUP_EXPORTS = {
  auth: ['authEndpoints'], tenants: ['tenantEndpoints'],
  branches: ['branchEndpoints'], departments: ['departmentEndpoints'],
  users: ['userEndpoints'], iam: ['iamEndpoints'], facility: ['facilityEndpoints'],
  academic: ['academicEndpoints'], grading: ['gradingEndpoints', 'gradingExtendedEndpoints'],
  config: ['configEndpoints'], sis: ['sisEndpoints'], admissions: ['admissionsEndpoints'],
  scheduling: ['schedulingEndpoints'], attendance: ['attendanceEndpoints'],
  billing: ['billingEndpoints'], invoices: ['invoiceEndpoints'],
  cashiering: ['cashieringEndpoints'], communications: ['communicationsEndpoints'],
  documents: ['documentsEndpoints'], hr: ['hrEndpoints'],
  reporting: ['reportingEndpoints'], reports: ['reportsEndpoints'],
};

// Keys that are TS type-literal properties (e.g. in `{ tenantId: string }`)
// or non-method tokens, not endpoint methods.
const NON_METHOD = new Set([
  'return', 'const', 'let', 'if', 'for', 'while', 'switch', 'try', 'catch',
  'string', 'number', 'boolean', 'unknown', 'any', 'void', 'Record', 'Promise',
  'data', 'params', 'body', 'query', 'id', 'tenantId', 'branchId', 'roomId',
  'email', 'password', 'firstName', 'lastName', 'name', 'code',
  'status', 'method', 'limit', 'search', 'page', 'file', 'response',
]);

// --- 1. api-client methods per group -------------------------------------
// Cache file sources so several groups can share one file.
const fileCache = new Map();
function fileSource(file) {
  if (!fileCache.has(file)) fileCache.set(file, fs.readFileSync(path.join(EP_DIR, file), 'utf8'));
  return fileCache.get(file);
}
function findExportFile(exportName) {
  for (const f of fs.readdirSync(EP_DIR).filter((f) => f.endsWith('.ts'))) {
    const src = fileSource(f);
    if (new RegExp(`export (?:const|function) ${exportName}\\b`).test(src)) return { file: f, src };
  }
  return null;
}

const groups = {};
for (const [group, exports] of Object.entries(GROUP_EXPORTS)) {
  const methods = new Set();
  for (const exportName of exports) {
    const found = findExportFile(exportName);
    if (!found) continue;
    const { src } = found;
    const decl = new RegExp(`export (?:const|function) ${exportName}\\b`).exec(src);
    let rest = src.slice(decl.index);
    const nextExport = /\nexport (?:const|function|type|interface) /.exec(rest.slice(10));
    const block = nextExport ? rest.slice(0, 10 + nextExport.index) : rest;
    for (const m of block.matchAll(/^ {2}([a-zA-Z][a-zA-Z0-9]*)\s*[:(]/gm)) {
      if (!NON_METHOD.has(m[1])) methods.add(m[1]);
    }
    for (const m of block.matchAll(/^ {4}([a-zA-Z][a-zA-Z0-9]*)\s*[:(]/gm)) {
      if (!NON_METHOD.has(m[1])) methods.add(m[1]);
    }
  }
  groups[group] = { methods: [...methods] };
}

// --- 2. portal usage -------------------------------------------------------
const usage = new Map(); // "group.method" -> [files]
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/apiClient\.(\w+)\.(\w+)/g)) {
        const key = `${m[1]}.${m[2]}`;
        if (!usage.has(key)) usage.set(key, []);
        usage.get(key).push(path.relative(ROOT, p).replace(/\\/g, '/'));
      }
    }
  }
}
walk(SP_DIR);

// --- 3. diffs ---------------------------------------------------------------
const broken = [];
for (const key of usage.keys()) {
  const [group, method] = key.split('.');
  if (!groups[group] || !groups[group].methods.includes(method)) broken.push(key);
}

const unreferenced = [];
for (const [group, { methods }] of Object.entries(groups)) {
  for (const method of methods) {
    if (!usage.has(`${group}.${method}`)) unreferenced.push(`${group}.${method}`);
  }
}

console.log(`api-client groups: ${Object.keys(groups).length}, methods: ${Object.values(groups).reduce((s, g) => s + g.methods.length, 0)}`);
console.log(`portal call sites: ${usage.size}\n`);

console.log('=== A) PORTAL CALLS WITH NO CLIENT METHOD (broken wiring) ===');
console.log(broken.length ? broken.join('\n') : '(none)');

console.log('\n=== B) CLIENT METHODS NEVER CALLED BY SCHOOL-PORTAL ===');
const byGroup = {};
for (const key of unreferenced) {
  const g = key.split('.')[0];
  (byGroup[g] ||= []).push(key.split('.')[1]);
}
for (const g of Object.keys(byGroup).sort()) {
  console.log(`${g}: ${byGroup[g].join(', ')}`);
}
