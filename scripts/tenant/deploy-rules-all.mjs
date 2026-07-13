#!/usr/bin/env node
// Fleet-wide rules sync: deploys firestore.rules + storage.rules from the
// repo to EVERY active tenant project. This is what keeps hundreds of
// UAT projects from drifting when the rules change.
//
// Usage:
//   node scripts/tenant/deploy-rules-all.mjs [--dry-run] [--only <slug>]

import { activeTenants, findTenant, sh, logStep } from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

const targets = only
  ? [findTenant(only)].filter(Boolean)
  : activeTenants();

if (targets.length === 0) {
  console.error(only ? `Tenantul "${only}" nu există în registru.` : 'Niciun tenant activ în registru.');
  process.exit(1);
}

console.log(`Deploy reguli către ${targets.length} tenant(i)${dryRun ? ' [dry-run]' : ''}\n`);

const results = [];
for (const tenant of targets) {
  logStep(`${tenant.numeComuna} (${tenant.firebaseProjectId})`);
  try {
    sh(
      `npx -y firebase-tools deploy --only firestore:rules,storage --project ${tenant.firebaseProjectId} --non-interactive`,
      { dryRun }
    );
    results.push({ slug: tenant.slug, ok: true });
  } catch (error) {
    console.error(`  ✗ eșuat: ${error.message?.split('\n')[0]}`);
    results.push({ slug: tenant.slug, ok: false });
  }
}

console.log('\n--- Rezumat ---');
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.slug}`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} tenant(i) au eșuat - reguli DESINCRONIZATE pe flotă!`);
  process.exit(1);
}
console.log('\nToate regulile sunt sincronizate.');
