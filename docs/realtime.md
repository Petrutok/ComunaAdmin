# Realtime — arhitectura listenerilor operaționali

## Scopul

Modulele operaționale (registratură, cereri, sesizări, registru, dashboard)
se actualizează **live**, fără buton „Reîncarcă" și fără reîncărcarea
întregii liste după fiecare acțiune. Restul aplicației (setări, configurări,
șabloane, statistici) rămâne pe `getDocs` clasic — vezi „De ce fetch clasic".

## Arhitectura aleasă

Un singur layer reutilizabil, deliberat simplu (nu o abstracție generică):

### `lib/hooks/useCollectionSnapshot.ts`
Înfășoară **un** `onSnapshot` cu ciclu de viață curat:
- `{ data, loading, error, fromCache }`;
- `loading` e `true` doar până la primul snapshot — la schimbarea filtrului
  lista deja populată nu se golește (fără flicker);
- `fromCache` (din `snapshot.metadata.fromCache`) semnalează starea de
  reconectare, afișată discret prin `LiveIndicator`, nu printr-un spinner;
- query-ul e memoizat de **apelant** (`useMemo` + un `queryKey` explicit);
  listenerul se re-abonează doar când `queryKey` se schimbă (obiectele Query
  Firestore sunt referințe noi la fiecare render și nu pot fi comparate
  direct — de aceea cheia e explicită);
- `firestoreQuery = null` = nu abona (ex. înainte de a ști `userId`);
- cleanup pe unmount / schimbare de query (`return () => unsubscribe()`).

### `components/admin/LiveIndicator.tsx`
Înlocuiește butonul „Reîncarcă": un indicator „Live" (punct verde animat)
sau „Reconectare…" (când `fromCache` e true). Reutilizat identic pe toate
paginile realtime.

### Registratura — layer propriu
`lib/hooks/useRegistratura.ts` avea deja hook + optimistic updates, deci
`onSnapshot` a fost pus **direct** acolo (pe colecția de emailuri), nu prin
hook-ul generic — un layer nu se înfășoară în alt layer. Datele de referință
(departamente, utilizatori) rămân un `getDocs` unic (`reload`).

## Fluxul datelor

```
Firestore  ──onSnapshot(query bounded)──▶  useCollectionSnapshot
                                              │  data (live window)
                                              ▼
   olderPages (getDocs one-shot, append) ──▶ useMemo: dedup by id ──▶ `cereri`/`documents`/...
                                                                         │
                                            filtrare/căutare client ─────┘  (neschimbat)
```

- **Fereastra live** = cele mai noi `limit(N)` documente, printr-un listener.
- **Paginile mai vechi** (butonul „Încarcă mai multe") = `getDocs` one-shot,
  adăugate într-un array separat; cursorul e `createdAt`/`dataInregistrare`
  al ultimului document încărcat (evită nevoia de `DocumentSnapshot`).
- Lista combinată = `[...live, ...older]` **de-duplicată după id** (un
  document poate apărea scurt în ambele dacă marginea ferestrei s-a mutat).
- Filtrarea, sortarea și căutarea client-side rămân neatinse; bannerul
  „Caută în toate" (din PR-ul anterior) folosește aceeași buclă `loadMoreOlder`.
- Mutațiile (status, atribuire, emitere) **nu mai apelează `loadX()`** — write-ul
  în Firestore declanșează snapshotul, care actualizează lista. Optimistic
  updates existente (registratură) rămân pentru feedback instant.

## Ciclul de viață al listenerilor

- **Atașare:** la montarea paginii (sau când `queryKey` se schimbă — ex.
  comutarea „Ale mele").
- **Actualizare:** la fiecare document schimbat în fereastră (nu re-citește
  toată colecția).
- **Detașare:** `unsubscribe()` pe unmount sau la schimbarea query-ului.
  Nu rămân listeneri orfani.
- **Reconectare:** Firestore reface conexiunea automat; `fromCache` devine
  `true` cât timp se servește din cache, apoi revine la `false`.

## Paginile convertite la realtime

| Pagină | Colecție (fereastră) | Note |
|---|---|---|
| `admin/cereri` | `form_submissions` `limit(100)` | + mod „Ale mele" (equality `limit(300)`), older pages, honest-search |
| `admin/issues` | `reported_issues` `limit(100)` | older pages, honest-search; count-urile din header rămân agregări server-side |
| `admin/registru` | `registru_general` `limit(200)` | older pages |
| `admin/registratura` | `registratura_emails` `limit(1000)` | listener în `useRegistratura`; „Sincronizează" (IMAP) rămâne |
| `admin` (dashboard) | `form_submissions` + `reported_issues` `limit(8)` | doar feed-ul de activitate recentă e live; vezi mai jos |

Butoanele „Reîncarcă" au fost eliminate de pe toate cele de mai sus,
înlocuite cu `LiveIndicator`.

## Ce a rămas pe fetch clasic și de ce

- **Dashboard — KPI-uri, termene depășite, programări azi:** contoarele sunt
  agregări (`getCountFromServer`), care **nu** suportă listeneri realtime în
  SDK-ul client. Sunt încărcate la montare și **re-încărcate când feed-ul live
  se schimbă** (cheie = semnătura activității), deci urmăresc realitatea fără
  aggregation-listener. Răspund la „ce am de făcut acum", unde câteva secunde
  de întârziere sunt irelevante.
- **Setări, șabloane, departamente, utilizatori, adeverințe, conținut,
  Monitorul Oficial, statistici, alerte, piața, joburi, anunțuri:** date de
  configurare/referință, editate rar sau de o singură persoană, ori agregări
  costisitoare (statistici încarcă colecții întregi). Realtime aici = cost fără
  beneficiu.

## Impactul asupra costurilor Firestore

Modelul de facturare e **per document citit**. Un listener citește documentele
o dată la atașare, apoi doar cele schimbate.

- **Înainte:** `limit(100)` citiri la deschidere **+ încă 100 după fiecare
  acțiune** (`loadX()` reîncărca toată lista). O sesiune cu 20 de schimbări de
  status = ~2.100 citiri.
- **Acum:** `limit(100)` citiri la atașare + 1 citire per modificare. Aceeași
  sesiune = ~120 citiri. **Realtime scade citirile** pentru utilizatorii activi.
- **Numărul de listeneri e mărginit structural:** o comună are ~5–15 angajați.
  4 pagini operaționale × 15 oameni ≈ 60 de listeneri concurenți per tenant —
  neglijabil față de limita Firestore (~1M conexiuni/proiect). **Fără risc de
  „prea mulți subscriberi".**
- **Singura protecție necesară:** ferestre `limit(...)` mărginite — niciun
  listener nu scanează colecția întreagă. Regulă respectată peste tot.

## Recomandări pentru extinderea realtime

1. **Programări** (`admin/programari`) — operațional, se convertește trivial
   cu același hook (query pe ziua curentă).
2. **Dosarul meu** (cetățean) — „statusul cererii ca la curier"; exclus din
   acest PR (tracking cetățean), dar hook-ul îl acoperă direct.
3. **Contoare live reale** — dacă se dorește liveness sub-secundă pe KPI, se
   poate deriva un contor dintr-un listener pe o fereastră mărginită de lucru
   (ex. status ∈ {noua, in_lucru}) în loc de `getCountFromServer`.
4. **Regula generală:** orice listă operațională, editată de mai mulți oameni,
   cu volum mărginibil prin `limit`, e candidat; datele de configurare nu sunt.
