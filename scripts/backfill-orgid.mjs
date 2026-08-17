import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const EMULATOR_HOST = 'http://127.0.0.1:8080';
const PROJECT_ID = 'big-bull-car-spa';
const BASE = `${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const COLLECTIONS = [
  'products',
  'categories',
  'suppliers',
  'stockMovements',
  'customers',
  'vehicles',
  'vehicleTasks',
  'taskStatusEvents',
  'services',
  'posSales',
  'posSaleItems',
  'mechanics',
  'mechanicLedgerEntries',
  'leaveRequests',
  'salaryRecords',
  'storeSettings',
  'notificationLogs',
  'auditLogs',
  'memberships',
  'users',
];

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Convert REST API fields format to a plain object
function fieldsToObj(fields) {
  if (!fields) return {};
  const obj = {};
  for (const [key, val] of Object.entries(fields)) {
    if ('stringValue' in val) obj[key] = val.stringValue;
    else if ('integerValue' in val) obj[key] = Number(val.integerValue);
    else if ('doubleValue' in val) obj[key] = val.doubleValue;
    else if ('booleanValue' in val) obj[key] = val.booleanValue;
    else if ('nullValue' in val) obj[key] = null;
    else if ('mapValue' in val) obj[key] = val.mapValue.fields || {};
    else if ('arrayValue' in val)
      obj[key] = (val.arrayValue.values || []).map((v) => fieldsToObj({ _: v })._);
    else if ('timestampValue' in val) obj[key] = val.timestampValue;
    else if ('referenceValue' in val) obj[key] = val.referenceValue;
    else obj[key] = val;
  }
  return obj;
}

function objToFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      fields[key] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (val instanceof Date) {
      fields[key] = { timestampValue: val.toISOString() };
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      fields[key] = { mapValue: { fields: objToFields(val) } };
    } else if (Array.isArray(val)) {
      fields[key] = { arrayValue: { values: val.map((v) => ({ stringValue: String(v) })) } };
    }
  }
  return fields;
}

async function listAllDocs(collection) {
  let allDocs = [];
  let pageToken;
  do {
    let url = `${BASE}/${collection}?pageSize=500`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const data = await fetchJson(url);
    const docs = (data.documents || []).map((d) => ({
      id: d.name.split('/').pop(),
      ...fieldsToObj(d.fields),
      _updateUrl: d.name, // full resource name for PATCH
    }));
    allDocs = allDocs.concat(docs);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return allDocs;
}

async function patchDocument(name, fields) {
  const url = `${EMULATOR_HOST}/${name}?updateMask.fieldPaths=orgId`;
  await fetchJson(url, {
    method: 'PATCH',
    body: JSON.stringify({ fields: objToFields(fields) }),
  });
}

async function main() {
  console.log('=== Backfill orgId on existing documents ===\n');

  // Step 1: Find the orgId from organizations collection
  console.log('1. Looking up organizations...');
  const orgs = await listAllDocs('organizations');
  if (orgs.length === 0) {
    console.log('No organizations found. Cannot determine orgId.');
    console.log('Please create an organization through the app first, or restart emulator fresh.');
    process.exit(1);
  }
  console.log(`   Found ${orgs.length} organization(s):`);
  for (const org of orgs) {
    console.log(`   - id: ${org.id}, slug: ${org.slug || '(no slug)'}`);
  }
  const orgId = orgs[0].id;
  console.log(`   Using orgId: ${orgId}\n`);

  // Step 2: For each collection, find docs missing orgId and backfill
  let totalUpdated = 0;
  for (const collection of COLLECTIONS) {
    try {
      const docs = await listAllDocs(collection);
      const needsOrgId = docs.filter((d) => !d.orgId && d.id !== orgId); // skip the org doc itself
      if (needsOrgId.length === 0) {
        console.log(`   ${collection}: ${docs.length} docs, all have orgId ✓`);
        continue;
      }
      console.log(
        `   ${collection}: ${docs.length} docs, ${needsOrgId.length} missing orgId — updating...`,
      );
      for (const doc of needsOrgId) {
        await patchDocument(doc._updateUrl, { orgId });
        totalUpdated++;
      }
      console.log(`     Updated ${needsOrgId.length} document(s)`);
    } catch (err) {
      console.log(`   ${collection}: ERROR — ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Total documents updated: ${totalUpdated}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
