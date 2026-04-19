"use client";

import { useEffect, useState } from "react";
import { tebligatlarDinle, musteriTebligatlariDinle } from "@/lib/services/tebligat.service";
import type { Tebligat } from "@/lib/types";

export function useTebligatlar() {
  const [data, setData] = useState<Tebligat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return tebligatlarDinle((list) => {
      setData(list);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

export function useMusteriTebligatlari(musteriId: string) {
  const [data, setData] = useState<Tebligat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return musteriTebligatlariDinle(musteriId, (list) => {
      setData(list);
      setLoading(false);
    });
  }, [musteriId]);

  return { data, loading };
}
