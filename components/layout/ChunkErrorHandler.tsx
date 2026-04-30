"use client";

import { useEffect } from "react";

/**
 * Yeni deployment sonrası eski chunk hash'leri 404 verdiğinde
 * sayfayı otomatik yenileyerek ChunkLoadError'u önler.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === "ChunkLoadError") {
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason?.name === "ChunkLoadError" || reason?.message?.includes("Loading chunk")) {
        window.location.reload();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
