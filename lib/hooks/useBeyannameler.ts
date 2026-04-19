"use client";

import { useEffect, useState } from "react";
import { beyannamelerDinle, musteriBeyannameleriniDinle } from "@/lib/services/beyanname.service";
import type { Beyanname } from "@/lib/types";

export function useBeyannameler() {
  const [data, setData] = useState<Beyanname[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return beyannamelerDinle((list) => {
      setData(list);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

export function useMusteriBeyannameleri(musteriId: string) {
  const [data, setData] = useState<Beyanname[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return musteriBeyannameleriniDinle(musteriId, (list) => {
      setData(list);
      setLoading(false);
    });
  }, [musteriId]);

  return { data, loading };
}
