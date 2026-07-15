"use client";

import { useEffect } from "react";
import { MaintenanceScreen } from "@/components/ui/MaintenanceScreen";
import { isChunkError, chunkReloadOnce } from "@/lib/utils/chunkReload";

/**
 * Route segmentlerinde oluşan tüm çalışma zamanı hatalarını yakalar
 * (kök layout dışındaki her yer). Kullanıcıya bakım ekranı gösterilir;
 * hata yalnızca konsola loglanır.
 */
export default function Error({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[App Error]", error);
    if (isChunkError(error)) chunkReloadOnce();
  }, [error]);

  return <MaintenanceScreen />;
}
