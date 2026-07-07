# Onboarding unei comune noi

Arhitectura: **instanțe izolate din același cod**. Fiecare comună are propriul
proiect Firebase (date complet separate — argument GDPR la vânzare), propriul
proiect Vercel și propriul domeniu. Toate rulează același repo; un push pe
`main` actualizează automat toate comunele.

Timp estimat pentru o comună nouă: **2–4 ore** (majoritatea așteptări pe DNS).

## 1. Firebase (proiect nou, dedicat comunei)

1. [console.firebase.google.com](https://console.firebase.google.com) → Add project → `primaria-<comuna>`
2. Activează: **Authentication** (Email/Password), **Firestore**, **Storage**
3. Project settings → adaugă o **Web app** → copiază config-ul (`NEXT_PUBLIC_FIREBASE_*`)
4. Project settings → **Service accounts** → Generate new private key (`FIREBASE_*`)
5. Local, publică regulile pe noul proiect:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=<cheia-descarcata.json> \
   npx firebase-tools deploy --only firestore:rules,storage --project primaria-<comuna>
   ```

## 2. Chei și servicii per comună

- **VAPID** (push): `npx web-push generate-vapid-keys`
- **Resend**: adaugă și verifică domeniul comunei în resend.com → `RESEND_FROM`
- **IMAP**: datele căsuței oficiale de email a primăriei (registratura automată)
- **CRON_SECRET**: `openssl rand -hex 24`

## 3. Vercel (proiect nou din același repo)

1. Vercel → Add New Project → importă **același repo GitHub** → numele comunei
2. Settings → Environment Variables → completează totul din `.env.tenant.example`
   (Production + Preview)
3. Settings → Domains → domeniul comunei (ex. `primaria-exemplu.ro`)
4. Deploy. De acum, fiecare push pe `main` actualizează automat și această comună.

## 4. Configurare funcțională (în aplicație)

1. Firebase Console → Authentication → creează contul primarului/secretarului
2. Firestore → colecția `users` → document cu **ID = UID-ul** din Authentication:
   `email`, `fullName`, `role: "admin"` (string), `active: true` (boolean!)
3. Login în `/admin` → **Setări adeverințe**: antet, numele primarului,
   semnătura + ștampila (PNG scanat)
4. Admin → Utilizatori: restul angajaților (`role: "employee"`)

## 5. Conținut și assets

- `public/logo.jpg` — stema/logo-ul comunei. Notă: assets-urile sunt în repo,
  deci momentan comun tuturor; pentru logo per comună folosește un asset per
  domeniu (TODO: mutare logo în Storage per tenant) sau branch de assets.
- Pagini cu conținut static de personalizat manual per comună (deocamdată):
  `app/colectare-selectiva` (calendarul de colectare), `app/events`,
  `app/ongoing-works`, `app/representatives`, `app/meeting-summaries`.
- `public/manifest.json` (numele PWA) — vezi TODO logo.

## 6. Aplicația Android (opțional, per comună)

Fiecare comună primește propria aplicație în Play Store:
1. `capacitor.config.json`: `appId` unic (ex. `ro.primariaexemplu.app`),
   `appName`, `server.url` = domeniul comunei
2. `npm run mobile:update` → Android Studio → semnează cu un keystore NOU
   (păstrează-l per comună!) → release în Play Console
3. Play Console: cont propriu al primăriei sau contul tău de agenție

## Checklist final înainte de predare

- [ ] Cetățean test: cont nou → cerere → număr REG- → apare în Dosarul meu
- [ ] Admin: notificare push de test ajunge pe telefon
- [ ] Adeverință test emisă → QR-ul se verifică verde pe `/verifica`
- [ ] Programare test → apare în Admin → Programări
- [ ] Alerta test → banner pe prima pagină
- [ ] Emailul de status pleacă de pe domeniul comunei (RESEND_FROM)
- [ ] Citire anonimă `form_submissions` prin REST → 403
