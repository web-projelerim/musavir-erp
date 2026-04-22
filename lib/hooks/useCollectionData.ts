"use client";

import { useEffect, useState } from "react";
import {
  subscribeCollection,
  type CollectionName,
  type DataSource,
} from "@/lib/firebase/firestore";

export function useCollectionData<T extends { id: string }>(
  collectionName: CollectionName,
  fallback: T[]
) {
  const [data, setData] = useState<T[]>(fallback);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeCollection(collectionName, fallback, (nextData, meta) => {
      setData(nextData);
      setSource(meta.source);
      setError(meta.error ?? null);
      setLoading(false);
    });

    return unsubscribe;
  }, [collectionName, fallback]);

  return { data, source, loading, error };
}
