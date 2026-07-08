// lib/registratura/ai-triage.ts
// AI triage for incoming registratura emails (server-only).
//
// For every new email, Gemini classifies it (official correspondence vs
// spam/advertising) and, for official mail, suggests the department,
// priority, tags and a short summary. Suggestions are exactly that - the
// clerk confirms them in the UI; nothing is auto-assigned.
//
// Requires GEMINI_API_KEY (aistudio.google.com). Without it, or on any
// error/timeout, the function returns null and the caller falls back to
// the keyword heuristic - ingestion NEVER breaks because of the AI.

export interface TriajResult {
  clasificare: 'oficial' | 'spam' | 'reclama';
  motiv: string;                 // one sentence, shown in quarantine
  rezumat: string;               // 1-2 sentence summary for the clerk
  departamentSugerat: string | null;
  prioritateSugerata: 'urgent' | 'normal' | 'low';
  etichete: string[];
}

const GEMINI_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 20_000;
const MAX_BODY_CHARS = 4000;

export async function triajeazaEmail(input: {
  from: string;
  subject: string;
  body: string;
  departamente: string[];
}): Promise<TriajResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Ești registratorul unei primării de comună din România. Analizează emailul de mai jos și răspunde STRICT cu JSON.

Departamentele primăriei: ${input.departamente.join(', ') || 'necunoscute'}

Reguli de clasificare:
- "oficial": corespondență reală către primărie - cereri, sesizări, adrese de la instituții, petiții, documente, întrebări ale cetățenilor
- "spam": mesaje frauduloase, phishing, loterii, mesaje fără sens
- "reclama": marketing, newslettere comerciale, oferte de servicii/produse nesolicitate, promoții

Fii PRUDENT: dacă există orice șansă rezonabilă să fie corespondență reală, clasifică "oficial". O reclamă înregistrată greșit costă puțin; o cerere reală pierdută e gravă.

Pentru emailuri oficiale, sugerează:
- departamentul potrivit din lista de mai sus (sau null dacă niciunul nu se potrivește)
- prioritatea: "urgent" doar pentru urgențe reale (avarii, termene legale iminente, instanțe), altfel "normal" sau "low"
- 1-3 etichete scurte, lowercase, fără diacritice (ex: "urbanism", "apia", "taxe")
- un rezumat de 1-2 propoziții în română

Email:
De la: ${input.from}
Subiect: ${input.subject}
Conținut: ${input.body.slice(0, MAX_BODY_CHARS)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                clasificare: { type: 'STRING', enum: ['oficial', 'spam', 'reclama'] },
                motiv: { type: 'STRING' },
                rezumat: { type: 'STRING' },
                departamentSugerat: { type: 'STRING', nullable: true },
                prioritateSugerata: { type: 'STRING', enum: ['urgent', 'normal', 'low'] },
                etichete: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['clasificare', 'motiv', 'rezumat', 'prioritateSugerata', 'etichete'],
            },
          },
        }),
      }
    );
    clearTimeout(timer);

    if (!response.ok) {
      console.error('[ai-triage] Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as TriajResult;

    // Defensive normalization - never trust model output blindly
    if (!['oficial', 'spam', 'reclama'].includes(parsed.clasificare)) return null;
    parsed.etichete = (parsed.etichete || [])
      .slice(0, 3)
      .map((t) => String(t).toLowerCase().trim())
      .filter(Boolean);
    parsed.departamentSugerat =
      parsed.departamentSugerat && input.departamente.includes(parsed.departamentSugerat)
        ? parsed.departamentSugerat
        : null;
    if (!['urgent', 'normal', 'low'].includes(parsed.prioritateSugerata)) {
      parsed.prioritateSugerata = 'normal';
    }

    return parsed;
  } catch (error) {
    console.error('[ai-triage] Triage failed (falling back to heuristic):', error);
    return null;
  }
}
