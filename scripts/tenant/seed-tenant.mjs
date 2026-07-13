#!/usr/bin/env node
// Seeds a freshly provisioned tenant with the minimum data the app
// expects, and creates the first admin account (the primar or the person
// doing the onboarding).
//
// Requires the tenant's Admin SDK credentials in env (same three vars the
// app itself uses) - easiest: `set -a; source tenants/.env.<slug>; set +a`
// after completing FIREBASE_CLIENT_EMAIL/PRIVATE_KEY in that file.
//
// Usage:
//   node scripts/tenant/seed-tenant.mjs --slug negri \
//     --admin-email primar@comuna-negri.ro --admin-name "Ion Popescu"

import { findTenant } from './lib.mjs';

function arg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const value = process.argv[idx + 1];
  return value && !value.startsWith('--') ? value : true;
}

const slug = arg('slug');
const adminEmail = arg('admin-email');
const adminName = arg('admin-name', 'Administrator');

if (!slug || !adminEmail) {
  console.error('Exemplu: node scripts/tenant/seed-tenant.mjs --slug negri --admin-email primar@comuna.ro --admin-name "Ion Popescu"');
  process.exit(1);
}

const tenant = findTenant(slug);
if (!tenant) {
  console.error(`Tenantul "${slug}" nu există în tenants/registry.json — rulează întâi create-tenant.`);
  process.exit(1);
}

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('Lipsesc credentialele Admin SDK. Rulează întâi:');
  console.error(`  set -a; source tenants/.env.${slug}; set +a`);
  process.exit(1);
}
if (FIREBASE_PROJECT_ID !== tenant.firebaseProjectId) {
  console.error(
    `Credentialele din env sunt pentru "${FIREBASE_PROJECT_ID}", dar tenantul "${slug}" folosește "${tenant.firebaseProjectId}". Oprit ca să nu scriem în proiectul greșit.`
  );
  process.exit(1);
}

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');

const app = initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);
const auth = getAuth(app);

console.log(`\nSeed pentru ${tenant.numeComuna} (${FIREBASE_PROJECT_ID})\n`);

// 1. First admin account: Auth user + users/{uid} doc (role admin).
//    Password: temporary random, sent via reset link.
let uid;
try {
  const existing = await auth.getUserByEmail(adminEmail).catch(() => null);
  if (existing) {
    uid = existing.uid;
    console.log(`✓ contul Auth există deja (${uid})`);
  } else {
    const created = await auth.createUser({
      email: adminEmail,
      displayName: adminName,
      password: (await import('node:crypto')).randomBytes(16).toString('hex'),
    });
    uid = created.uid;
    console.log(`✓ cont Auth creat (${uid})`);
  }

  await db.collection('users').doc(uid).set(
    {
      email: adminEmail,
      fullName: adminName,
      role: 'admin',
      departmentId: null,
      active: true,
      createdAt: Timestamp.now(),
    },
    { merge: true }
  );
  console.log('✓ users/{uid} cu rol admin');

  const resetLink = await auth.generatePasswordResetLink(adminEmail);
  console.log(`\nLink de setare parolă pentru ${adminEmail} (trimite-l pe un canal sigur):\n  ${resetLink}\n`);
} catch (error) {
  console.error('Eroare la crearea adminului:', error.message);
  process.exit(1);
}

// 2. Issuing settings skeleton (numele se completează din admin UI)
await db.doc('config/adeverinta_settings').set(
  {
    localitate: tenant.antetOficial,
    judet: tenant.judet,
    primarNume: '',
    secretarNume: '',
    primarUserId: null,
    secretarUserId: null,
  },
  { merge: true }
);
console.log('✓ config/adeverinta_settings');

// 3. Registry counter for the current year (starts at 0; first act gets 000001)
const year = new Date().getFullYear();
await db
  .collection('registru_counters')
  .doc(String(year))
  .set({ year, lastNumber: 0 }, { merge: true });
console.log(`✓ registru_counters/${year}`);

// 4. Default departments (editable in admin)
const DEPARTAMENTE = [
  'Secretariat / Registratură',
  'Registru agricol',
  'Taxe și impozite',
  'Asistență socială',
  'Urbanism',
  'Stare civilă',
];
const existingDepts = await db.collection('departments').limit(1).get();
if (existingDepts.empty) {
  for (const name of DEPARTAMENTE) {
    await db.collection('departments').add({
      name,
      description: '',
      responsibleUserId: null,
      createdAt: Timestamp.now(),
    });
  }
  console.log(`✓ ${DEPARTAMENTE.length} departamente implicite`);
} else {
  console.log('✓ departamente: existau deja, nu suprascriu');
}

console.log(`\nSeed complet. Următorul pas: adminul intră pe https://${tenant.productionDomain}/admin,`);
console.log('completează Setări documente (nume + semnături) și Monitorul Oficial.\n');
