"use client";

import { useEffect, useState } from "react";
import { tebligatlarDinle, musteriTebligatlariDinle } from "@/lib/services/tebligat.service";
import { MOCK_TEBLIGATLAR } from "@/lib/data/mock";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import type { Tebligat } from "@/lib/types";

export function useTebligatlar() {
  const [data, setData] = useState<Tebligat[]>(MOCK_TEBLIGATLAR);
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = tebligatlarDinle((list) => {
      if (list.length > 0) setData(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading };
}

export function useMusteriTebligatlari(musteriId: string) {
  const [data, setData] = useState<Tebligat[]>(
    MOCK_TEBLIGATLAR.filter((t) => t.musteriId === musteriId)
  );
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = musteriTebligatlariDinle(musteriId, (list) => {
      setData(list);
      setLoading(false);
    });
    return unsub;
  }, [musteriId]);

  return { data, loading };
}
