"use client";

import { useEffect, useState } from "react";
import { gorevlerDinle, musteriGorevleriDinle } from "@/lib/services/gorev.service";
import type { Gorev } from "@/lib/types";

export function useGorevler() {
  const [data, setData] = useState<Gorev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return gorevlerDinle((list) => {
      setData(list);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

export function useMusteriGorevleri(musteriId: string) {
  const [data, setData] = useState<Gorev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return musteriGorevleriDinle(musteriId, (list) => {
      setData(list);
      setLoading(false);
    });
  }, [musteriId]);

  return { data, loading };
}
