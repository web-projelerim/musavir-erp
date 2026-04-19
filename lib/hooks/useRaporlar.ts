"use client";

import { useEffect, useState } from "react";
import { raporlarDinle } from "@/lib/services/rapor.service";
import { MOCK_RAPORLAR } from "@/lib/data/mock";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import type { Rapor } from "@/lib/types";

export function useRaporlar() {
  const [data, setData] = useState<Rapor[]>(MOCK_RAPORLAR);
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = raporlarDinle((list) => {
      if (list.length > 0) setData(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, setData, loading };
}
