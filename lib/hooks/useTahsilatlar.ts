"use client";

import { useEffect, useState } from "react";
import { tahsilatlarDinle, musteriTahsilatlariDinle } from "@/lib/services/tahsilat.service";
import { MOCK_TAHSILATLAR } from "@/lib/data/mock";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import type { Tahsilat } from "@/lib/types";

export function useTahsilatlar() {
  const [data, setData] = useState<Tahsilat[]>(MOCK_TAHSILATLAR);
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = tahsilatlarDinle((list) => {
      if (list.length > 0) setData(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading };
}

export function useMusteriTahsilatlari(musteriId: string) {
  const [data, setData] = useState<Tahsilat[]>(
    MOCK_TAHSILATLAR.filter((t) => t.musteriId === musteriId)
  );
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = musteriTahsilatlariDinle(musteriId, (list) => {
      setData(list);
      setLoading(false);
    });
    return unsub;
  }, [musteriId]);

  return { data, loading };
}
