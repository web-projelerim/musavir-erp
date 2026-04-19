import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COL } from "@/lib/firebase/collections";
import type { KDV2Hesaplama } from "@/lib/types";

const col = () => collection(db, COL.KDV2);

export async function kdv2Kaydet(data: Omit<KDV2Hesaplama, "id">): Promise<string> {
  const ref = await addDoc(col(), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export function kdv2DinleHepsi(cb: (list: KDV2Hesaplama[]) => void) {
  return onSnapshot(
    query(col(), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as KDV2Hesaplama)))
  );
}
