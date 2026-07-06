"use client";

import { useEffect } from "react";
import { MaintenanceScreen } from "@/components/ui/MaintenanceScreen";

/**
 * Route segmentlerinde oluşan tüm çalışma zamanı hatalarını yakalar
 * (kök layout dışındaki her yer). Kullanıcıya bakım ekranı gösterilir;
 * hata yalnızca konsola loglanır.
 */
export default function Error({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[App Error]", error);

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

  return <MaintenanceScreen />;
}
