"use client";

import { useEffect, useState } from "react";
import { beyannamelerDinle, musteriBeyannameleriniDinle } from "@/lib/services/beyanname.service";
import { MOCK_BEYANNAMELER } from "@/lib/data/mock";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import type { Beyanname } from "@/lib/types";

export function useBeyannameler() {
  const [data, setData] = useState<Beyanname[]>(MOCK_BEYANNAMELER);
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = beyannamelerDinle((list) => {
      if (list.length > 0) setData(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading };
}

export function useMusteriBeyannameleri(musteriId: string) {
  const [data, setData] = useState<Beyanname[]>(
    MOCK_BEYANNAMELER.filter((b) => b.musteriId === musteriId)
  );
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = musteriBeyannameleriniDinle(musteriId, (list) => {
      setData(list);
      setLoading(false);
    });
    return unsub;
  }, [musteriId]);

  return { data, loading };
}
