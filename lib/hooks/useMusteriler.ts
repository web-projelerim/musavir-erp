"use client";

import { useEffect, useState } from "react";
import { musterilerDinle, musteriDinle } from "@/lib/services/musteri.service";
import type { Musteri } from "@/lib/types";

export function useMusteriler() {
  const [data, setData] = useState<Musteri[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = musterilerDinle((list) => {
      setData(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading, error };
}

export function useMusteri(id: string) {
  const [data, setData] = useState<Musteri | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = musteriDinle(id, (m) => {
      setData(m);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  return { data, loading };
}
