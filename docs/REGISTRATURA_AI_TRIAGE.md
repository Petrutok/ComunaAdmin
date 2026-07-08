# Triaj AI pentru registratură

La fiecare email nou, înainte de a primi număr de înregistrare, un model AI îl
clasifică: **corespondență oficială** (intră în registratură, cu sugestii de
compartiment/prioritate/etichete) sau **spam/reclamă** (merge în carantină, nu
consumă număr, dar rămâne recuperabilă cu un click).

## Configurare — gratuit

Adaugă în variabilele de mediu (Vercel) o cheie Google AI Studio:

```
GEMINI_API_KEY=...
```

Cheia se obține gratuit de la [aistudio.google.com](https://aistudio.google.com)
(Get API key). Modelul implicit e `gemini-2.0-flash`; nivelul **gratuit** permite
~1.500 de cereri/zi — mult peste volumul de emailuri al unei comune. Deci
triajul rulează **la cost zero**.

### Model configurabil

```
TRIAGE_GEMINI_MODEL=gemini-2.0-flash   # implicit; poți pune alt model Gemini
```

## Fără cheie? Tot funcționează

Dacă `GEMINI_API_KEY` lipsește sau apelul AI eșuează/expiră, sistemul cade
automat pe **filtrul de cuvinte-cheie** existent (`isSpam`) — gratuit, fără
apeluri externe, fără date care pleacă din sistem. Spam-ul detectat merge tot
în carantină, nu direct la ștergere. Ingestia emailurilor **nu se blochează
niciodată** din cauza AI.

## Notă GDPR (important pentru date reale de cetățeni)

Nivelul **gratuit** Google AI Studio poate folosi conținutul trimis pentru
îmbunătățirea produselor Google. Pentru emailuri cu date personale (CNP,
adrese), în producție reală:

- **Recomandat**: activează facturarea pe proiectul Google Cloud → treci pe
  tier-ul plătit (la volumul unei comune, **cenți pe lună**), unde datele
  **nu** mai sunt folosite pentru training. Codul și cheia rămân aceleași.
- **Alternativ (100% privat, zero cost)**: nu seta `GEMINI_API_KEY` deloc —
  rulează doar filtrul de cuvinte-cheie, fără ca vreun email să părăsească
  infrastructura.

Pentru testare și pilot, nivelul gratuit e perfect.

## Siguranță prin design

- Prompt prudent: la orice dubiu rezonabil → „oficial" (o cerere reală pierdută
  e mult mai gravă decât o reclamă înregistrată din greșeală).
- Validarea răspunsului modelului e o funcție pură testată (`normalizeTriajResult`,
  `tests/registratura-triage.test.ts`) — nimic ce decide intrarea în registrul
  oficial nu rulează netestat.
- Spam-ul nu se șterge niciodată automat: carantina e revizuibilă de personal.
