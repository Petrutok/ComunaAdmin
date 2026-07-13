#!/usr/bin/env node
// Provisions a new UAT tenant: one Firebase project per comuna (full data
// isolation) + generated env file for its Vercel project. Automates what
// the CLI can and prints an explicit checklist for the console-only steps.
//
// Usage:
//   node scripts/tenant/create-tenant.mjs \
//     --slug negri --comuna "Comuna Negri" --judet "Județul Bacău" \
//     --domain primaria-negri.ro [--dry-run]
//
// Everything is idempotent-ish: re-running skips what already exists in
// the registry and re-prints the checklist.

import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  readRegistry,
  writeRegistry,
  findTenant,
  isValidSlug,
  sh,
  logStep,
  logManual,
} from './lib.mjs';

function arg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const value = process.argv[idx + 1];
  return value && !value.startsWith('--') ? value : true;
}

const dryRun = process.argv.includes('--dry-run');
const slug = arg('slug');
const comuna = arg('comuna');
const judet = arg('judet', 'Județul —');
const domain = arg('domain', slug ? `${slug}.primaria.digital` : undefined);

if (!slug || !comuna || typeof slug !== 'string' || typeof comuna !== 'string') {
  console.error('Lipsesc argumente. Exemplu:');
  console.error(
    '  node scripts/tenant/create-tenant.mjs --slug negri --comuna "Comuna Negri" --judet "Județul Bacău" --domain primaria-negri.ro'
  );
  process.exit(1);
}
if (!isValidSlug(slug)) {
  console.error(`Slug invalid: "${slug}" (litere mici, cifre, cratime; 3-31 caractere)`);
  process.exit(1);
}

const existing = findTenant(slug);
if (existing && !dryRun) {
  console.error(`Tenantul "${slug}" există deja în registru (proiect: ${existing.firebaseProjectId}).`);
  process.exit(1);
}

const projectId = arg('project-id', `primaria-${slug}`);
const numePrimarie = comuna.replace(/^Comuna\s+/i, 'Primăria ').replace(/^Orașul\s+/i, 'Primăria ');
const antetOficial = `PRIMĂRIA ${comuna.replace(/^Comuna\s+/i, 'COMUNEI ').replace(/^Orașul\s+/i, 'ORAȘULUI ').toUpperCase()}`;

console.log(`\nProvisioning tenant: ${comuna} (${slug})`);
console.log(`  Proiect Firebase:  ${projectId}`);
console.log(`  Domeniu:           ${domain}`);
if (dryRun) console.log('  MOD: dry-run (nu se creează nimic)\n');

// ---------------------------------------------------------------- Firebase
logStep('1. Proiect Firebase');
sh(`npx -y firebase-tools projects:create ${projectId} --display-name "${comuna}" --non-interactive`, {
  dryRun,
  allowFail: true, // already-exists is fine
});

logStep('2. Aplicație web + config client');
const appOut = sh(
  `npx -y firebase-tools apps:create web "${comuna}" --project ${projectId} --non-interactive`,
  { dryRun, allowFail: true }
);
const appIdMatch = appOut.match(/App ID:\s*(\S+)/);
let sdkConfig = null;
if (!dryRun) {
  const cfgOut = sh(
    `npx -y firebase-tools apps:sdkconfig web ${appIdMatch ? appIdMatch[1] : ''} --project ${projectId} --non-interactive`,
    { allowFail: true }
  );
  const jsonMatch = cfgOut.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      sdkConfig = JSON.parse(jsonMatch[0]);
    } catch {
      /* printed below as manual step */
    }
  }
}

logStep('3. Firestore + Storage + reguli');
// Firestore database must exist before rules deploy; recent projects get
// it created on first deploy, otherwise the console step is printed below.
sh(`npx -y firebase-tools deploy --only firestore:rules,storage --project ${projectId} --non-interactive`, {
  dryRun,
  allowFail: true,
});

// ------------------------------------------------------------------- VAPID
logStep('4. Chei VAPID (web push)');
let vapid = { publicKey: '<generat la rulare>', privateKey: '<generat la rulare>' };
if (!dryRun) {
  const { default: webpush } = await import('web-push');
  vapid = webpush.generateVAPIDKeys();
  console.log('  chei generate ✓');
}

// ---------------------------------------------------------------- Env file
logStep('5. Fișier de environment pentru Vercel');
const envPath = path.join(ROOT, 'tenants', `.env.${slug}`);
const envContent = `# Environment pentru tenantul "${slug}" (${comuna})
# Se încarcă în proiectul Vercel al tenantului (Settings -> Environment Variables).
# NU se comite cu valori reale completate - fișierul e in .gitignore.

# --- Tenant (client, baked la build)
NEXT_PUBLIC_TENANT_COMUNA=${comuna}
NEXT_PUBLIC_TENANT_PRIMARIE=${numePrimarie}
NEXT_PUBLIC_TENANT_ANTET=${antetOficial}
NEXT_PUBLIC_TENANT_JUDET=${judet}
NEXT_PUBLIC_TENANT_TELEFON=
NEXT_PUBLIC_TENANT_EMAIL=
NEXT_PUBLIC_API_URL=https://${domain}

# --- Firebase client SDK
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${sdkConfig?.projectId || projectId}
NEXT_PUBLIC_FIREBASE_API_KEY=${sdkConfig?.apiKey || '<din consola Firebase>'}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${sdkConfig?.authDomain || `${projectId}.firebaseapp.com`}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${sdkConfig?.storageBucket || `${projectId}.firebasestorage.app`}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${sdkConfig?.messagingSenderId || '<din consola Firebase>'}
NEXT_PUBLIC_FIREBASE_APP_ID=${sdkConfig?.appId || '<din consola Firebase>'}

# --- Firebase Admin SDK (service account, vezi checklist)
FIREBASE_PROJECT_ID=${projectId}
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# --- Web push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}
VAPID_EMAIL=mailto:contact@${domain}

# --- Email (Resend + IMAP registratura)
RESEND_API_KEY=
RESEND_FROM=
EMAIL_HOST=
EMAIL_PORT=993
EMAIL_USER=
EMAIL_PASSWORD=

# --- Cron
CRON_SECRET=${dryRun ? '<generat la rulare>' : randomBytes(24).toString('hex')}
`;
if (!dryRun) {
  writeFileSync(envPath, envContent);
  console.log(`  scris: tenants/.env.${slug}`);
} else {
  console.log(`  [dry-run] ar scrie: tenants/.env.${slug}`);
}

// ---------------------------------------------------------------- Registry
logStep('6. Registru tenanți');
if (!dryRun) {
  const registry = readRegistry();
  registry.tenants.push({
    slug,
    numeComuna: comuna,
    numePrimarie,
    antetOficial,
    judet,
    firebaseProjectId: projectId,
    productionDomain: domain,
    vercelProject: `primaria-${slug}`,
    status: 'provisioning',
    createdAt: new Date().toISOString().slice(0, 10),
  });
  writeRegistry(registry);
  console.log(`  adăugat "${slug}" cu status "provisioning" (treci pe "active" când e live)`);
} else {
  console.log(`  [dry-run] ar adăuga "${slug}" în tenants/registry.json`);
}

// --------------------------------------------------------------- Checklist
logStep('Checklist pași rămași (consolă / Vercel)');
logManual(`Firebase Console (${projectId}): Authentication -> Sign-in method -> activează Email/Password`);
logManual('Firebase Console: Firestore Database -> Create database (region europe-west), dacă deploy-ul de reguli a eșuat mai sus, apoi re-rulează pasul 3');
logManual('Firebase Console: Storage -> Get started (același region), dacă deploy-ul storage a eșuat');
logManual('Firebase Console: Project settings -> Service accounts -> Generate new private key; completează FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY în env');
logManual(`Vercel: creează proiectul "primaria-${slug}" din același repo, încarcă tenants/.env.${slug}, adaugă domeniul ${domain}`);
logManual('Resend: verifică domeniul de email al comunei și completează RESEND_API_KEY/RESEND_FROM');
logManual('IMAP: completează EMAIL_* cu contul registraturii (dacă comuna are)');
logManual(`Seed date inițiale: node scripts/tenant/seed-tenant.mjs --slug ${slug} --admin-email <email primar>`);
logManual('La final: schimbă status-ul în tenants/registry.json din "provisioning" în "active"');

console.log('\nGata. Health-check pe toată flota: npm run tenant:health\n');
