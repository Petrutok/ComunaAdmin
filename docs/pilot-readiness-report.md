# PILOT READINESS REPORT
### Primăria Digitală — versiunea 1.0 Pilot · UAT fluxuri cap-coadă

Validare a proceselor complete, exact cum le-ar folosi un funcționar într-o zi
de lucru. S-au rezolvat problemele **Critice** și **Importante**; cele **Minore**
au fost trecute în [Backlog v2](./backlog-v2.md).

---

## 1. Fluxuri validate

| # | Flux | Verdict |
|---|------|---------|
| 1 | Cerere online → Registratură → Repartizare → Rezolvare → Emitere → Notificare → Dosarul meu | 🟢 (după corecție) |
| 2 | Adeverință → Avizare → Semnare → PDF → Număr ieșire → Verificare publică | 🟢 |
| 3 | Sesizare → Moderare → Rezolvare → Răspuns | 🟢 (după corecție) |
| 4 | Programare → Confirmare → Finalizare → Anulare | 🟢 |
| 5 | Registratură email → Înregistrare → Repartizare | 🟢 |
| 6 | Onboarding funcționar → Login → Operare | 🟢 |

---

## 2. Detaliu pe fluxuri

### Flux 1 — Cerere online (🟢 după corecție)
Depunere: validare câmpuri/CNP/email, rate-limit, număr de registratură unificat,
intrare în `registru_general` cu termen legal de 30 zile (OG 27/2002),
`form_submissions` cu backlink, audit `istoric`, auto-repartizare (când e
configurată) cu audit + push, email de confirmare. Schimbarea de status trece
prin `/api/schimba-status` (update + sync registru + audit + notificare push+email
într-o singură cerere server). Emiterea leagă documentul și rezolvă cererea.
Cetățeanul vede numărul, statusul și documentele în „Dosarul meu”.
- **Problemă Importantă (rezolvată):** statusul `repartizata` (produs de
  auto-repartizare) nu era tratat în interfața de cereri — crăpa badge-ul de
  status (acces la `undefined`) și lipsea din vederea „deschise / Ale mele”.

### Flux 2 — Adeverință (🟢)
Circuit de avizare complet (Întocmit → Secretar → Primar) cu guard-uri anti-dublură
și tranziții corecte; semnarea de către primarul desemnat (sau admin); PDF cu
blocuri de semnătură + QR; număr de ieșire din contorul unificat; înregistrare de
verificare (`adeverinte_emise` cu cod secret); intrare `iesire` în registru și
închiderea intrării originale; notificare cu PDF-ul atașat; verificare publică la
`/verifica` care cere număr + cod și returnează nume mascat. Fără probleme.

### Flux 3 — Sesizare (🟢 după corecție)
Depunere cu număr RAPORT, link la cont, status `noua`. Moderarea trece prin
`/api/schimba-status` (update + notificare cetățean). Note interne pentru personal.
- **Problemă Importantă (rezolvată):** pagina de probleme nu avea niciun feedback
  (toast) — schimbarea de status (care notifică cetățeanul) și notele interne
  reușeau sau eșuau **silențios**; pe eroare funcționarul putea crede că a rezolvat
  și notificat când operațiunea eșuase.

### Flux 4 — Programare (🟢)
Rezervare cu autentificare, interval valid (zi lucrătoare, mâine…30 zile), validare
telefon, o singură programare activă/serviciu, ID de slot determinist → dubla
rezervare eșuează atomic. Anularea de către cetățean verifică proprietatea și
eliberează slotul. Funcționarul finalizează sau anulează (cu confirmare — adăugată
în faza pilot). Fără probleme Critice/Importante.

### Flux 5 — Registratură email (🟢)
IMAP → dedupe (messageId + carantină) → carantină pentru spam/reclame (nu consumă
numere) → număr unificat → atașamente în Storage (nume sanitizat) → `registratura_emails`
+ index `registru_general` cu termen 30 zile. Repartizarea atribuie
departament/responsabil, mută statusul în `repartizata`, loghează audit și trimite
push. Fără probleme Critice/Importante.

### Flux 6 — Onboarding funcționar (🟢)
`/api/admin/users` (admin-only, Admin SDK) creează contul Firebase Auth și
`users/{uid}` cheiat pe uid-ul real, apoi se trimite email de setare parolă. Login-ul
(`getUserRole`) și rutele API (`verifyStaffRequest`) găsesc utilizatorul după uid →
lanț consecvent. Angajatul nou se autentifică și operează conform rolului. Fără
probleme Critice/Importante. (Reparat integral în faza de configurare — PR #56.)

---

## 3. Probleme găsite

| Severitate | Flux | Problemă |
|-----------|------|----------|
| Importantă | 1 | Status `repartizata` netratat → crăpa lista de cereri + invizibil în vederea deschisă |
| Importantă | 3 | Moderarea sesizărilor fără feedback → eșec silențios la o acțiune care notifică cetățeanul |
| Minoră | 3 | Fără text de rezoluție/motiv la respingere; fără istoric automat de status |
| Minoră | 4 | Anulare de funcționar fără notificare; anulare de cetățean fără confirmare |
| Minoră | 5 | Handler POST fetch-emails cu autorizare confuză (GET re-verifică); emoji în log |
| Minoră | 6 | Email de setare parolă eșuat silențios (recuperabil); checkbox „activ” ignorat la creare |
| Minoră | UI | Emoji în butoanele de download din „Dosarul meu” și în iconografia de categorie |

**Critice: 0.**

---

## 4. Probleme rezolvate (în această fază)

- **Flux 1:** `repartizata` devine status de prim rang — adăugat în tip, în
  `statusConfig` (afișare + filtru) și în `OPEN_STATUSES`; fallback defensiv pe
  badge; exclus din selectorul de schimbare manuală; afișat corect și în „Dosarul
  meu”.
- **Flux 3:** adăugat `useToast` + toast de succes/eroare la schimbarea statusului
  și de eroare la nota internă în pagina de probleme.

Verificare: `typecheck` 0 erori · `tests` 138/138 · `build` OK · `eslint` 0 erori.

---

## 5. Probleme amânate pentru v2

Toate problemele Minore de mai sus sunt documentate în
[docs/backlog-v2.md](./backlog-v2.md), împreună cu recomandările de hardening
post-pilot (backup Firestore programat, monitorizare de erori).

---

## 6. Verdict final

Toate cele 6 fluxuri au fost validate cap-coadă și **toate problemele Critice și
Importante au fost eliminate**. Rămân doar probleme Minore, niciuna blocantă pentru
operarea zilnică într-o primărie.

# 🟢 GATA PENTRU PILOT
