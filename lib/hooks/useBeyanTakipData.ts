"use client";

import { useEffect, useState } from "react";
import {
  COLLECTIONS,
  subscribeCollectionFiltered,
  type DataSource,
} from "@/lib/firebase/firestore";
import type { BeyanTakipHucresi, BeyanTakipNotu } from "@/lib/types";

export function useBeyanTakipData(donem: string, ofisId?: string) {
  const [hucreler, setHucreler] = useState<BeyanTakipHucresi[]>([]);
  const [geciciNotlar, setGeciciNotlar] = useState<BeyanTakipNotu[]>([]);
  const [kaliciNotlar, setKaliciNotlar] = useState<BeyanTakipNotu[]>([]);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ofisId || !donem) {
      setHucreler([]);
      setGeciciNotlar([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let hucreReady = false;
    let notReady = false;

    function checkReady() {
      if (hucreReady && notReady) setLoading(false);
    }

    const unsubHucreler = subscribeCollectionFiltered<BeyanTakipHucresi>(
      COLLECTIONS.beyanTakipHucreleri,
      [
        { field: "ofisId", op: "==", value: ofisId },
        { field: "donem", op: "==", value: donem },
      ],
      [],
      (data, meta) => {
        setHucreler(data);
        setSource(meta.source);
        hucreReady = true;
        checkReady();
      }
    );

    const unsubNotlar = subscribeCollectionFiltered<BeyanTakipNotu>(
      COLLECTIONS.beyanTakipNotlari,
      [
        { field: "ofisId", op: "==", value: ofisId },
        { field: "donem", op: "==", value: donem },
      ],
      [],
      (data, meta) => {
        setGeciciNotlar(data.filter((n) => n.tur === "gecici"));
        setSource(meta.source);
        notReady = true;
        checkReady();
      }
    );

    return () => {
      unsubHucreler();
      unsubNotlar();
    };
  }, [donem, ofisId]);

  // Kalici notlar donemden bagimsiz — ayri subscription
  useEffect(() => {
    if (!ofisId) {
      setKaliciNotlar([]);
      return;
    }

    const unsub = subscribeCollectionFiltered<BeyanTakipNotu>(
      COLLECTIONS.beyanTakipNotlari,
      [
        { field: "ofisId", op: "==", value: ofisId },
        { field: "tur", op: "==", value: "kalici" },
      ],
      [],
      (data) => {
        setKaliciNotlar(data);
      }
    );

    return unsub;
  }, [ofisId]);

  return { hucreler, geciciNotlar, kaliciNotlar, source, loading };
}
