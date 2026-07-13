#!/usr/bin/env node
// Fleet health-check: for every tenant in the registry, verifies that
// the public site responds and that its Firestore backend answers with
// the expected security posture (public MOL read allowed, personal data
// denied without auth).
//
// Usage: node scripts/tenant/health-check.mjs [--only <slug>]

import { readRegistry, findTenant } from './lib.mjs';

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;
const targets = only ? [findTenant(only)].filter(Boolean) : readRegistry().tenants;

if (targets.length === 0) {
  console.error('Niciun tenant de verificat.');
  process.exit(1);
}

async function check(name, fn) {
  try {
    const ok = await fn();
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    return !!ok;
  } catch (error) {
    console.log(`  ✗ ${name} (${error.message?.split('\n')[0]})`);
    return false;
  }
}

function firestoreQuery(projectId, collectionId) {
  return fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId }], limit: 1 },
      }),
    }
  );
}

let allOk = true;

for (const tenant of targets) {
  console.log(`\n${tenant.numeComuna} — ${tenant.productionDomain} [${tenant.status}]`);

  const siteOk = await check('site public (200)', async () => {
    const r = await fetch(`https://${tenant.productionDomain}/`, { redirect: 'follow' });
    return r.ok;
  });

  const molOk = await check('pagina Monitorul Oficial (200)', async () => {
    const r = await fetch(`https://${tenant.productionDomain}/monitorul-oficial/`, { redirect: 'follow' });
    return r.ok;
  });

  // Security posture: public collections readable, personal data NOT.
  const publicReadOk = await check('Firestore: citire publică MOL permisă', async () => {
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${tenant.firebaseProjectId}/databases/(default)/documents:runQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'mol_documente' }],
            where: {
              fieldFilter: { field: { fieldPath: 'activ' }, op: 'EQUAL', value: { booleanValue: true } },
            },
            limit: 1,
          },
        }),
      }
    );
    const body = await r.text();
    return r.ok && !body.includes('PERMISSION_DENIED');
  });

  const personalDeniedOk = await check('Firestore: date personale REFUZATE fără auth', async () => {
    const r = await firestoreQuery(tenant.firebaseProjectId, 'form_submissions');
    const body = await r.text();
    return body.includes('PERMISSION_DENIED');
  });

  const ok = siteOk && molOk && publicReadOk && personalDeniedOk;
  if (!ok && tenant.status === 'active') allOk = false;
}

console.log(allOk ? '\nFlota este sănătoasă. ✓' : '\nProbleme la cel puțin un tenant ACTIV! ✗');
process.exit(allOk ? 0 : 1);
