"use client";

import { useEffect } from "react";

/**
 * En üst seviye hata sınırı: kök layout'un kendisi çökerse burası devreye girer.
 * Kendi <html>/<body>'sini ve satır-içi stillerini taşır — Tailwind veya app
 * sağlayıcıları yüklenmemiş olsa bile bakım ekranı her koşulda görünür.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Global Error]", error);

    const isChunkError =
      error.name === "ChunkLoadError" ||
      /loading chunk/i.test(error.message) ||
      /failed to fetch/i.test(error.message);

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("last-chunk-error-reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem("last-chunk-error-reload", now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #172554 100%)",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: "#e2e8f0",
          padding: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mm.jpg"
            alt="MusavirERP"
            width={80}
            height={80}
            style={{ borderRadius: 16, objectFit: "cover", marginBottom: 24, boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px", color: "#fff" }}>
            Şu anda bakımdayız
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#cbd5e1", margin: 0 }}>
            Kısa sürecek. Anlayışınız için teşekkür ederiz.
          </p>
          <p style={{ marginTop: 32, fontSize: 12, color: "#64748b" }}>MusavirERP</p>
        </div>
      </body>
    </html>
  );
}
