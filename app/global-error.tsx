'use client';

// Last-resort boundary: catches errors thrown in the ROOT layout itself.
// It replaces <html>/<body>, so it must be self-contained and cannot rely
// on the app's providers or Tailwind being available — uses inline styles.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (typeof console !== 'undefined') {
    console.error('[global-error]', error);
  }
  return (
    <html lang="ro">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            A apărut o eroare neașteptată
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
            Ne pare rău, aplicația a întâmpinat o problemă. Reîncărcați pagina; dacă problema
            persistă, contactați administratorul.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reîncarcă pagina
          </button>
          {error?.digest && (
            <p style={{ color: '#475569', fontSize: 11, marginTop: 16 }}>
              Cod eroare: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
