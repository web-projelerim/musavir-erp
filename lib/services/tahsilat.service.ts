import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COL } from "@/lib/firebase/collections";
import type { Tahsilat, TahsilatDurum } from "@/lib/types";

const col = () => collection(db, COL.TAHSILATLAR);

export async function tahsilatEkle(data: Omit<Tahsilat, "id">): Promise<string> {
  const ref = await addDoc(col(), data);
  return ref.id;
}

export async function tahsilatOdendi(id: string): Promise<void> {
  await updateDoc(doc(db, COL.TAHSILATLAR, id), {
    durum: "odendi",
    odemeTarihi: new Date().toISOString(),
  });
}

export async function tahsilatDurumGuncelle(id: string, durum: TahsilatDurum): Promise<void> {
  await updateDoc(doc(db, COL.TAHSILATLAR, id), { durum });
}

export function tahsilatlarDinle(cb: (list: Tahsilat[]) => void) {
  return onSnapshot(
    query(col(), orderBy("vadeTarihi", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tahsilat)))
  );
}

export function musteriTahsilatlariDinle(musteriId: string, cb: (list: Tahsilat[]) => void) {
  return onSnapshot(
    query(col(), where("musteriId", "==", musteriId), orderBy("vadeTarihi", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tahsilat)))
  );
}
