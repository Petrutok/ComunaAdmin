# Multi-tenant: un SaaS pentru mai multe UAT-uri

## Modelul

**Un repo → N proiecte Firebase → N proiecte Vercel.** Fiecare comună (tenant)
primește propriul proiect Firebase (Firestore + Auth + Storage complet izolate)
și propriul proiect Vercel construit din acest repo, cu variabilele ei de
environment. Codul este identic pentru toți; diferă doar configurația
(`lib/tenant.ts` citește `NEXT_PUBLIC_TENANT_*`).

De ce izolare completă și nu partajare cu `tenantId`:

- **GDPR și încredere**: datele unei primării nu coexistă fizic cu ale alteia;
  răspunsul la "unde sunt datele noastre?" este un proiect dedicat.
- **Blast radius zero**: o greșeală de reguli sau un incident afectează un
  singur UAT.
- **Fără refactor**: aplicația de azi funcționează neschimbată; nu există
  `where('tenantId'...)` de adăugat în sute de query-uri.
- Costul: la volumele unei comune, fiecare proiect stă lejer în free tier /
  Blaze cu costuri de ordinul câtorva euro.

Compromisul acceptat: operarea flotei se face prin scripturi (mai jos), nu
dintr-un singur dashboard. La sute de tenanți se poate adăuga un control-plane
web peste același registru.

## Registrul (sursa de adevăr)

`tenants/registry.json` — lista tuturor tenanților: slug, nume, proiect
Firebase, domeniu, proiect Vercel, status (`provisioning` / `active` /
`suspended`). Toate scripturile iterează registrul; nimic nu e hardcodat.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run tenant:create -- --slug negri --comuna "Comuna Negri" --judet "Județul Bacău" --domain primaria-negri.ro` | Creează proiectul Firebase, aplicația web, deployează regulile, generează chei VAPID + `tenants/.env.negri`, adaugă tenantul în registru și tipărește checklist-ul pașilor manuali. Suportă `--dry-run`. |
| `npm run tenant:seed -- --slug negri --admin-email primar@... --admin-name "..."` | Creează primul cont de admin (cu link de setare parolă), setările de emitere, counterul de registru și departamentele implicite. Cere credentialele Admin SDK ale tenantului în env (`set -a; source tenants/.env.negri; set +a`). |
| `npm run tenant:rules` | Deployează `firestore.rules` + `storage.rules` către TOȚI tenanții activi — rulează după orice modificare de reguli, altfel flota desincronizează. `--only <slug>` pentru unul singur. |
| `npm run tenant:health` | Verifică fiecare tenant: site 200, pagina MOL 200, citirea publică Firestore permisă, datele personale refuzate fără auth. Exit code 1 dacă un tenant activ e picat. |

## Onboarding-ul unui UAT nou (runbook)

1. `npm run tenant:create -- --slug <slug> --comuna "..." --judet "..." --domain <domeniu>`
2. Pașii `[MANUAL]` tipăriți de script: activare Email/Password în Auth,
   eventual creare Firestore/Storage din consolă (regiune `europe-west`),
   generare cheie service account → completată în `tenants/.env.<slug>`.
3. Vercel: proiect nou din același repo, import env din `tenants/.env.<slug>`,
   adaugă domeniul.
4. `npm run tenant:seed -- --slug <slug> --admin-email <email primar>` și
   trimite link-ul de parolă primarului.
5. Primarul (sau tu, la onboarding): Setări documente (nume + semnături +
   conturi desemnate), Utilizatori (angajați + semnături), primele documente
   în Monitorul Oficial.
6. Schimbă statusul în registru pe `active`; `npm run tenant:health`.

## Reguli de operare a flotei

- **Orice PR care atinge `firestore.rules`/`storage.rules`** se termină cu
  `npm run tenant:rules` după merge (Vercel NU deployează regulile).
- Deploy-ul de cod e automat: push pe `main` → toate proiectele Vercel
  ale tenanților se reconstruiesc din același commit.
- Secretele stau exclusiv în `tenants/.env.*` (gitignored) și în Vercel;
  registrul comis conține doar identificatori publici.
