"use client";

import { useEffect, useState } from "react";
import {
  subscribeCollection,
  subscribeCollectionFiltered,
  type CollectionFilter,
  type CollectionName,
  type DataSource,
} from "@/lib/firebase/firestore";

export function useCollectionData<T extends { id: string }>(
  collectionName: CollectionName,
  _fallback?: T[],
  enabled = true,
  ofisId?: string,
  filters?: CollectionFilter[]
) {
  const [data, setData] = useState<T[]>([]);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtreleri kararlı bir anahtara çevir (useEffect bağımlılığı için)
  const filterKey = filters ? JSON.stringify(filters) : "";

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setSource("mock");
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = (nextData: T[], meta: { source: DataSource; error?: string }) => {
      setData(nextData);
      setSource(meta.source);
      setError(meta.error ?? null);
      setLoading(false);
    };

    // Özel filtre verildiyse (ör. mükellef için musteriId) onu kullan; yoksa ofisId ile filtrele
    const unsubscribe =
      filters && filters.length > 0
        ? subscribeCollectionFiltered<T>(collectionName, filters, [], handle)
        : subscribeCollection<T>(collectionName, [], handle, ofisId);

    return unsubscribe;
    // filters yerine kararlı filterKey (serileştirilmiş) bağımlılık olarak kullanılır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled, ofisId, filterKey]);

  return { data, source, loading, error };
}
