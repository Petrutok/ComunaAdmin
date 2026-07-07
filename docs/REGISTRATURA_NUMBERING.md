# Sistemul de numere de înregistrare

## Garanții

| Cerință | Cum e asigurată |
|---|---|
| **Număr unic** | Un singur contor (`registru_counters/{an}`) incrementat exclusiv în **tranzacții Firestore** — două cereri simultane nu pot primi același număr (una dintre tranzacții e reluată automat pe valoarea nouă). |
| **Serie anuală** | Format `REG-YYYY-NNNNNN`; documentul de contor e per an, deci seria repornește de la 1 la fiecare 1 ianuarie, fără intervenție manuală. |
| **Imposibilitatea duplicării** | Contorul nu poate fi decrementat din aplicație; regulile Firestore permit scrierea doar personalului, iar toate căile de emitere (email IMAP, cereri online, adeverințe, intrări manuale) trec prin **același generator**: `lib/generateRegistruNumberAdmin.ts` (server) / `lib/utils/generateRegistruNumber.ts` (client, panou admin). |
| **Rezervarea numerelor** | Intrarea manuală din Registru (Admin → Registru → Intrare nouă) consumă un număr în momentul salvării — pentru documente pe hârtie primite la ghișeu. Un număr consumat rămâne consumat chiar dacă documentul e șters ulterior (fără goluri „reciclate", cerință de audit). |
| **Trasabilitate completă** | Fiecare document are jurnal de activitate imutabil (subcolecția `activity`: cine, ce, când — create-only, fără update/delete). Contorul păstrează `updatedAt`; `registru_general` indexează fiecare număr emis cu sursa și direcția lui. |

## Formatul

`REG-2026-000123` — prefix fix, anul emiterii, secvență pe 6 cifre (capacitate 999.999 documente/an).
Sesizările cetățenilor folosesc seria separată `RAPORT-YYYY-NNNNNN` (contor propriu, `config/registratura_counter`) — serie operațională, distinctă de registrul oficial.

## Ce NU trebuie făcut

- Nu edita manual documentele `registru_counters/*` din consolă — orice valoare mai mică decât ultima emisă produce duplicate.
- Nu introduce alte generatoare — orice flux nou de documente trebuie să apeleze generatorul unificat existent.
