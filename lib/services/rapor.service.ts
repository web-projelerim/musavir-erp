import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COL } from "@/lib/firebase/collections";
import type { Rapor, RaporDurum, RaporTip } from "@/lib/types";

const col = () => collection(db, COL.RAPORLAR);

export async function raporOlustur(data: Omit<Rapor, "id">): Promise<string> {
  const ref = await addDoc(col(), { ...data, olusturmaTarihi: serverTimestamp() });
  return ref.id;
}

export async function raporDurumGuncelle(id: string, durum: RaporDurum): Promise<void> {
  const update: Partial<Rapor> = { durum };
  if (durum === "gonderildi") update.gonderimTarihi = new Date().toISOString();
  await updateDoc(doc(db, COL.RAPORLAR, id), update);
}

export async function raporSil(id: string): Promise<void> {
  await deleteDoc(doc(db, COL.RAPORLAR, id));
}

export function raporlarDinle(cb: (list: Rapor[]) => void) {
  return onSnapshot(
    query(col(), orderBy("olusturmaTarihi", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rapor)))
  );
}
