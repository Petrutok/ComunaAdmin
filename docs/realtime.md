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

## Cum adaugi realtime pe o pagină nouă (rețetă)

```tsx
// 1. Query BOUNDED, memoizat, cu queryKey explicit:
const liveQuery = useMemo(
  () => query(collection(db, 'colectia_mea'), orderBy('createdAt', 'desc'), limit(100)),
  [/* inputurile query-ului, ex. filtru */]
);

// 2. Abonează-te. `label` e pentru observabilitate. queryKey = aceleași inputuri.
const { data, loading, fromCache } = useCollectionSnapshot<TipulMeu>(
  liveQuery,
  (id, d) => ({ id, ...d }) as TipulMeu,
  [/* aceleași inputuri ca la useMemo */],
  'colectia-mea'
);

// 3. Indicator live în locul butonului „Reîncarcă":
<LiveIndicator fromCache={fromCache} />
```

**Reguli obligatorii:**
- Query-ul **trebuie** să aibă `limit(N)` — un listener fără limită scanează
  colecția întreagă și facturează la fiecare atașare.
- `queryKey` = exact inputurile din care e construit query-ul (primitive).
  Greșit: array nou la fiecare render fără memoizare → re-subscribe în buclă.
- Pasează `null` ca query cât timp nu ești gata (ex. `userId` încă necunoscut).
- **Nu** apela un `loadX()` după mutații — write-ul declanșează snapshotul care
  actualizează lista. Apelurile de reload după mutație sunt exact ce am eliminat.
- Pentru paginare: realtime pe prima fereastră, paginile vechi cu `getDocs`
  one-shot adăugate separat și de-duplicate după id (vezi `admin/cereri`).

**Când NU folosi realtime:** date de configurare/referință (setări, șabloane,
departamente, utilizatori), pagini editate de o singură persoană, sau agregări
peste colecții întregi (statistici). Acolo rămâne `getDocs`.

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

## Guard-ul anti-rerender (important)

Ascultăm cu `includeMetadataChanges: true` ca să detectăm tranziția
cache↔online pentru indicatorul „Reconectare…". Efectul secundar: callback-ul
se declanșează și pe **ping-uri de metadate** (ex. `hasPendingWrites` care
comută când un write local e confirmat de server). Fără protecție, fiecare
astfel de ping re-mapează toată lista și face `setState` cu o referință nouă →
re-render inutil.

`computeNextState` (funcție **pură**, unit-testată în `tests/realtime.test.ts`)
rezolvă asta: dacă evenimentul nu aduce nicio schimbare de document
(`snapshot.docChanges().length === 0`) și nici o schimbare de cache, întoarce
**același obiect de stare** → React sare peste re-render. Documentele se
re-mapează doar când chiar s-au schimbat; la o simplă schimbare de cache se
reutilizează referința array-ului de date, deci rândurile listei nu se
re-randează. `useRegistratura` aplică aceeași logică inline pe listenerul de
emailuri.

## Observabilitate (`lib/realtime-debug.ts`)

Fiecare listener se înregistrează la atașare și se dezînregistrează la cleanup.
- **Detectarea leak-urilor:** `window.__realtime.active` trebuie să scadă spre 0
  când părăsești paginile operaționale. Dacă rămâne crescut, un listener nu s-a
  închis. `byLabel` arată pe ce pagină.
- **Latența primului snapshot:** timpul de la subscribe la primul snapshot +
  numărul de documente, logat ca `first-snapshot`.
- **Activare logging** (oprit implicit, fără zgomot în producție):
  `localStorage.setItem('rt_debug', '1')` apoi reload, sau build cu
  `NEXT_PUBLIC_RT_DEBUG=1`.
- **Inspecție rapidă în producție** (fără flag): în consolă `window.__realtime`
  arată `{ active, peak, byLabel, events[] }`.

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
  „prea mulți subscriberi".** Firestore nu taxează listenerii, doar citirile.
- **Singura protecție necesară:** ferestre `limit(...)` mărginite — niciun
  listener nu scanează colecția întreagă. Regulă respectată peste tot.

### Estimare la scară

Ipoteze conservatoare per comună: ~10 angajați, ~2.000 citiri/angajat/zi
(deschideri de pagini + actualizări live + contoare dashboard), 22 zile
lucrătoare → **~0,5 milioane citiri/lună/UAT**.

**Cheia arhitecturii multi-tenant:** fiecare UAT e un **proiect Firebase
separat**, deci fiecare are propriul **free tier de 50.000 citiri/zi
(~1,5M/lună)**. O comună mică la ~0,5M citiri/lună stă **integral în free tier**
→ 0 lei pe citiri. Doar UAT-urile mari depășesc.

| Scară | Citiri/lună (total) | Cost citiri (est.) | Note |
|---|---|---|---|
| 10 UAT-uri | ~5M | **~0–3 $/lună** | majoritatea sub free tier per proiect |
| 100 UAT-uri | ~50M | **~10–30 $/lună** | doar cele mari depășesc free tier-ul |
| 500 UAT-uri | ~250M | **~50–150 $/lună** | dominat de UAT-urile mari; ~0,10–0,30 $/UAT/lună mediu |

Realtime **nu crește** costul față de varianta veche cu „Reîncarcă" — îl scade,
pentru că elimină reîncărcarea completă după fiecare acțiune. Costul de mai sus
e al citirilor operaționale în ansamblu, nu un supliment adus de realtime.

## Rezultatele auditului de stabilizare

Verificat pe toate implementările:
- ✅ **Cleanup:** fiecare `onSnapshot` are `unsubscribe()` în funcția de cleanup
  a `useEffect`; niciun listener orfan. `window.__realtime.active` confirmă.
- ✅ **Fără subscribe duplicat / bucle de re-subscribe:** `queryKey`-urile sunt
  primitive stabile (`[mineOnly, uid]`, `[]`, `[isEmployee]`); listenerul se
  re-abonează doar la schimbare reală. Query-urile sunt memoizate în apelant.
- ✅ **Fără re-render-uri inutile:** rezolvat prin `computeNextState` (vezi mai
  sus). Ping-urile de metadate nu mai produc re-randări.
- ✅ **Fără memory leaks:** confirmat prin registrul de listeneri + cleanup.
- ⓘ **StrictMode (dev):** montează efectele de două ori în development
  (subscribe→unsubscribe→subscribe); e comportament normal, acoperit de cleanup,
  nu apare în producție.

## Matrice de testare manuală (necesită sesiune autentificată + Firestore real)

Aceste scenarii cer date reale și rețea, deci se rulează manual (nu în CI):

| Scenariu | Pași | Rezultat așteptat |
|---|---|---|
| Două tab-uri | Deschide `admin/cereri` în 2 tab-uri; schimbă un status în tab 1 | Tab 2 reflectă instant, fără refresh |
| Doi utilizatori | Doi angajați logați; unul repartizează o cerere | Celălalt vede repartizarea live |
| Două browsere | Chrome + Firefox pe registratură | Ambele sincronizate live |
| Status simultan | Doi useri schimbă statusul aceluiași document aproape simultan | Ultima scriere câștigă; ambii ajung la aceeași stare finală |
| Creare | Depune o cerere nouă (alt device) | Apare în capul listei operatorului, fără refresh |
| Ștergere | Șterge o intrare din registru | Dispare din toate tab-urile deschise |
| Reconectare | Oprește rețeaua ~10s, apoi repornește | Indicatorul devine „Reconectare…", apoi „Live"; lista se resincronizează |
| Refresh în timpul modificării | Schimbă un status și dă refresh imediat | Fără date pierdute; lista revine corectă (write-ul e persistat server-side) |
| Leak check | Navighează prin toate paginile operaționale, apoi pleacă | `window.__realtime.active` revine spre 0 |

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
