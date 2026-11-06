"use client"

// Kök layout çökerse devreye girer; kendi <html> ve <body> etiketlerini içermelidir.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f7fa" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#122c4a", margin: 0 }}>Uygulama başlatılamadı</h2>
          <p style={{ color: "#718397", maxWidth: 280, margin: 0, fontSize: 14 }}>
            Lütfen tekrar deneyin. Sorun devam ederse uygulamayı kapatıp yeniden açın.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#d64526",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "12px 20px",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  )
}
