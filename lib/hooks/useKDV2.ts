"use client";

import { useEffect, useState } from "react";
import { kdv2DinleHepsi } from "@/lib/services/kdv2.service";
import { MOCK_KDV2 } from "@/lib/data/mock";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import type { KDV2Hesaplama } from "@/lib/types";

export function useKDV2() {
  const [data, setData] = useState<KDV2Hesaplama[]>(MOCK_KDV2);
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = kdv2DinleHepsi((list) => {
      if (list.length > 0) setData(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading };
}
