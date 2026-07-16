# Backlog v2

Probleme **Minore** identificate în timpul UAT-ului pentru versiunea 1.0 Pilot,
amânate deliberat pentru după pilot. Niciuna nu blochează operarea zilnică
într-o primărie. (Funcționalitățile mari amânate — builder de tipuri de cereri
din admin, config branding din admin, plăți Ghișeul.ro, semnătură calificată,
AI triaj, Inbox „De lucrat azi”, agregare server-side pentru statistici,
rate-limiting persistent — rămân în afara scopului pilotului.)

## Din validarea fluxurilor (UAT)

### Flux 3 — Sesizări
- **Fără text de rezoluție/motiv la respingere.** La schimbarea statusului unei
  sesizări (ex. „Respinsă”), cetățeanul primește doar eticheta de status, fără
  un mesaj explicativ. Cererile au răspuns oficial (PDF); sesizările nu.
- **Fără istoric automat de status pentru sesizări.** `reported_issues` nu
  primește o intrare de audit la fiecare schimbare de status (spre deosebire de
  cereri, care au subcolecția `istoric`). Se păstrează `updatedAt`, `resolvedAt`
  și notele interne manuale.

### Flux 4 — Programări
- **Anularea de către funcționar nu notifică cetățeanul.** Programările nu au
  deloc un canal de notificare (ar fi funcție nouă). Cetățeanul vede dispariția
  programării în „Dosarul meu”.
- **Anularea de către cetățean nu cere confirmare.** Butonul „Anulează” din
  „Dosarul meu” anulează instantaneu (dar dă feedback prin toast); e propria lui
  programare, re-rezervabilă.

### Flux 5 — Registratură email
- **Handler POST `/api/fetch-emails` are logică de autorizare confuză.** Permite
  trecerea cu orice header `Authorization`, dar `GET` (apelat imediat) re-verifică
  autorizarea și respinge cu 401 — deci nu e o gaură de securitate, doar cod
  derutant de curățat.
- **Emoji `✓` într-un `console.log`** din `registratura-service.ts` (logare de
  server, nu UI).

### Flux 6 — Onboarding funcționar
- **Emailul de setare parolă eșuat silențios.** După crearea utilizatorului,
  `sendPasswordResetEmail` rulează best-effort; dacă eșuează, adminul vede totuși
  „I-am trimis email…”. Recuperabil: noul utilizator poate folosi „Am uitat
  parola” din pagina de login.
- **Checkbox „activ” ignorat la creare.** Formularul de utilizator nou arată un
  toggle „activ”, dar ruta creează întotdeauna utilizatorul activ. Dezactivarea
  se face după creare, din editare.

## UI / cosmetice
- **Emoji în UI-ul cetățeanului** — butoanele „📄 Descarcă adeverința / răspunsul
  oficial” din „Dosarul meu”; iconografia de categorie (emoji) din dropdown-urile
  de tip problemă / tip anunț. Curățenia din faza pilot a acoperit toast-urile,
  titlurile de buton/dialog și log-urile; iconografia de categorie și aceste
  butoane au rămas ca schimbare de alt tip.

## Hardening (recomandat post-pilot)
- Script de backup Firestore programat.
- Monitorizare minimă de erori (ex. Sentry) pentru vizibilitate în producție.
