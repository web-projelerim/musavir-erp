"use client";

import { useEffect, useRef, useState } from "react";
import {
  subscribeCollection,
  type CollectionName,
  type DataSource,
} from "@/lib/firebase/firestore";

export function useCollectionData<T extends { id: string }>(
  collectionName: CollectionName,
  fallback: T[],
  enabled = true,
  ofisId?: string
) {
  const fallbackRef = useRef(fallback);
  const [data, setData] = useState<T[]>(fallback);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(fallbackRef.current);
      setSource("mock");
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeCollection(
      collectionName,
      fallbackRef.current,
      (nextData, meta) => {
        setData(nextData);
        setSource(meta.source);
        setError(meta.error ?? null);
        setLoading(false);
      },
      ofisId
    );

    return unsubscribe;
  }, [collectionName, enabled, ofisId]);

  return { data, source, loading, error };
}
