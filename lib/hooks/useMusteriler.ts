"use client";

import { useEffect, useState } from "react";
import { musterilerDinle, musteriDinle } from "@/lib/services/musteri.service";
import { MOCK_MUSTERILER } from "@/lib/data/mock";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import type { Musteri } from "@/lib/types";

export function useMusteriler() {
  const [data, setData] = useState<Musteri[]>(MOCK_MUSTERILER);
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = musterilerDinle((list) => {
      if (list.length > 0) setData(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading };
}

export function useMusteri(id: string) {
  const mock = MOCK_MUSTERILER.find((m) => m.id === id) ?? MOCK_MUSTERILER[0];
  const [data, setData] = useState<Musteri>(mock);
  const [loading, setLoading] = useState(FB_CONFIGURED);

  useEffect(() => {
    if (!FB_CONFIGURED) return;
    const unsub = musteriDinle(id, (m) => {
      if (m) setData(m);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  return { data, loading };
}
