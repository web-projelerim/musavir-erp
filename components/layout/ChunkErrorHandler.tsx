"use client";

import { useEffect } from "react";
import { isChunkError, chunkReloadOnce } from "@/lib/utils/chunkReload";

/**
 * Yeni deployment sonrası eski chunk hash'leri 404 verdiğinde
 * sayfayı otomatik yenileyerek ChunkLoadError'u önler.
 * Yenileme döngü korumalıdır (bkz. lib/utils/chunkReload.ts).
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isChunkError(event.error)) chunkReloadOnce();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) chunkReloadOnce();
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
