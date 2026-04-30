"use client";

import { useEffect, useState } from "react";
import {
  subscribeDocById,
  type CollectionName,
  type DataSource,
} from "@/lib/firebase/firestore";

export function useDocumentData<T extends { id: string }>(
  collectionName: CollectionName,
  docId: string | undefined,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !docId) {
      setData(null);
      setSource("mock");
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeDocById<T>(collectionName, docId, (doc, meta) => {
      setData(doc);
      setSource(meta.source);
      setLoading(false);
    });

    return unsubscribe;
  }, [collectionName, docId, enabled]);

  return { data, source, loading };
}
