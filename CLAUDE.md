# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Primăria Digitală" is a digital platform for a Romanian commune (Filipești, Bacău). Next.js 15 PWA + Capacitor 7 mobile shell, Firebase backend. Citizens get accounts ("Dosarul meu"), online forms with automatic registry numbers, digitally issued certificates (adeverințe) with QR verification, issue reporting, appointments, urgent alerts and push notifications. Staff get a unified document registry with legal deadlines, email registratura (IMAP), certificate issuance and a decision dashboard.

## Commands

```bash
npm run dev          # Dev server on port 9002 (Turbopack)
npm run build        # Production build - TypeScript errors BLOCK the build
npm run typecheck    # tsc --noEmit (0 errors policy; CI enforces it)
npm test             # vitest (tests/ - pure logic: slots, rate-limit, adeverinte, alerts)
npm run mobile:update  # Next build + Capacitor sync
npm run android:run    # Build and open in Android Studio
```

CI (`.github/workflows/ci.yml`) runs typecheck + tests on every PR to main.

## Architecture

- **Framework**: Next.js 15 App Router, **server mode** (NOT static export - API routes are essential). Deployed on Vercel, project `v2`, production domain `primaria.digital`, auto-deploy on push to `main`.
- **Mobile**: Capacitor 7 (target SDK 35), Android only for now. Thin shell loading `https://primaria.digital` (capacitor.config.json server.url), so web deploys update the app instantly. Command-line Gradle builds need Java 21 (Android Studio's bundled JDK).
- **UI**: Radix UI + Tailwind, dark slate theme, Romanian language.
- **Backend**: Firebase - Firestore, Auth, Storage, web-push (VAPID) + FCM, Resend for email sending, imapflow for IMAP fetching.

### Two authentication worlds

- **Staff** (`contexts/AdminAuthContext.tsx`): Firebase Auth + `users/{uid}` doc with `role: 'admin'|'employee'` and `active: true`. The `users` doc is REQUIRED - API routes and Firestore rules check it; the hardcoded AUTHORIZED_ADMINS list is only a client-side login fallback.
- **Citizens** (`contexts/CitizenAuthContext.tsx`): Firebase Auth + `citizens/{uid}` profile. Email verification is sent but non-blocking. Required for adeverinte and appointments; optional (but linking) for cereri/sesizari.

### Server-side security model (lib/api-auth.ts)

- All staff API routes verify `Authorization: Bearer <Firebase ID token>` via `verifyStaffRequest(request, roles)` - checks token + `users/{uid}` role.
- Public routes (report-issue, trimite-cerere, push/subscribe, programari, verifica) use `rateLimit()` from `lib/rate-limit.ts` (in-memory, per IP) + payload caps.
- `getOptionalCitizenUid(request)` extracts a VERIFIED citizen uid; never trust a uid from the request body.
- **API routes use the Admin SDK exclusively** (`getAdminDb/getAdminAuth/getAdminBucket` from `lib/firebase-admin.ts`) - the client SDK is unauthenticated on the server and blocked by rules.
- `firestore.rules` + `storage.rules` are in the repo and deployed with `firebase deploy --only firestore:rules,storage` (project `village-hub-h1qiy`). Public content readable; personal data staff-only; citizens read their own docs (`citizenUid == auth.uid`); default deny.

### Unified registry (core domain concept)

ONE counter (`registru_counters/{year}`, format `REG-YYYY-NNNNNN`) for everything: manual entries, IMAP emails, online form submissions, issued adeverinte. `registru_general` is the index - every document gets an entry with `sursa` (manual/email/cerere_online/adeverinta), `directie` (intrare/iesire), and a 30-day legal `termen` (OG 27/2002) highlighted red in the admin UI when overdue. `config/registratura_counter` remains ONLY for RAPORT- numbers (issues). Number generators: `lib/generateRegistruNumberAdmin.ts` (server) / `lib/utils/generateRegistruNumber.ts` (client, admin pages).

### Key flows

- **Cerere online** (`/api/trimite-cerere`): validate -> unified registry number -> `registru_general` intrare + `form_submissions` doc (linked both ways) -> confirmation screen shows the number -> visible in Dosarul meu.
- **Adeverinte** (`lib/adeverinte.ts`, `/api/emite-adeverinta`, admin-only): request is a cerere with tipCerere `adeverinta-*` (account required) -> admin fills the prefilled legal template -> PDF (jsPDF + removeDiacritics convention) with letterhead, signature image (Storage `config/semnatura-primar.png`, settings in Firestore `config/adeverinta_settings`), QR verification -> outgoing registry number -> download in Dosarul meu. Public verification: `/verifica?nr=...&c=<secret>` via `adeverinte_emise` collection.
- **Appointments** (`/api/programari`, `types/appointments.ts`): deterministic slot doc IDs (`service_date_HHmm`) make double-booking impossible (create() fails); one active appointment per citizen per service; cancel = delete (frees the slot).
- **Status notifications** (`lib/notify-status.ts`, server-side): status changes go through `/api/schimba-status` (update + registry sync + audit + notify in one request); the emit routes notify directly after issuing. Push (subscriptions carry verified `citizenUid`) + Resend email. Set `RESEND_FROM` env var to a verified sender.
- **Alerts** (`types/alerts.ts`): staff publish urgent alerts with auto-expiry; homepage banner + `/alerte` + optional push broadcast.
- **Email registratura** (`lib/registratura-service.ts`, server-only): IMAP fetch -> dedupe by messageId -> unified number -> attachments to Storage -> `registratura_emails` + `registru_general` index entry.

### Firestore collections

`users` (staff), `citizens`, `form_submissions`, `reported_issues`, `registru_general`, `registru_counters`, `registratura_emails`, `adeverinte_emise`, `appointments`, `alerts`, `announcements`, `jobs`, `push_subscriptions`, `notifications`, `notification_history`, `departments`, `config` (counters + adeverinta settings).

## Conventions & gotchas

- **Timestamps**: shared types use `FirestoreTimestamp` (client | admin union) from `types/registratura.ts`. Server code imports Timestamp from `firebase-admin/firestore`, client from `firebase/firestore` - never mix instances across SDK boundaries.
- **PDFs**: jsPDF with `removeDiacritics()` (standard fonts lack Romanian diacritics). Follow the existing pattern.
- **Admin lists are paginated** (cursor + "Încarcă mai multe"); keep it that way for new lists.
- **Dosarul meu queries** avoid composite indexes (filter on citizenUid only, sort client-side).
- New cereri form types go in THREE places: `REQUEST_CONFIGS` (lib/simple-pdf-generator.ts), `formMetadata` + generateStaticParams (app/cereri-online/[formType]/page.tsx), and the listing (app/cereri-online/page.tsx).
- Service worker (`public/sw.js`): Network First for HTML, Cache First for hashed assets, every fetch branch MUST return a real Response. Bump CACHE_NAME on SW changes.
- ESLint runs in CI (`npm run lint`, flat config in `eslint.config.mjs`): ERRORS block the PR, warnings are advisory (~150 legacy, mostly unused vars — clean opportunistically). The build itself skips lint (`ignoreDuringBuilds: true`); TypeScript is NOT skipped (`ignoreBuildErrors: false`).

## Environment variables

See `.env.local` (also mirrored in Vercel project `v2`): `NEXT_PUBLIC_FIREBASE_*` (client), `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` (Admin SDK), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_EMAIL` (push), `EMAIL_*` (IMAP), `RESEND_API_KEY`/`RESEND_FROM`, `CRON_SECRET` (fetch-emails cron).

## Deployment

- **Web**: merge to `main` -> Vercel auto-deploys to primaria.digital. Vercel blocks Next.js versions with known CVEs - keep `next` updated.
- **Firebase rules**: NOT deployed by Vercel; run `firebase deploy --only firestore:rules,storage` after changing rules files (non-interactive with a service-account via GOOGLE_APPLICATION_CREDENTIALS).
- **Android**: `npm run mobile:update` then release from Android Studio (Play Store requires target API 34+; we ship 35).
