import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COL } from "@/lib/firebase/collections";
import type { Tebligat, TebligatDurum } from "@/lib/types";

const col = () => collection(db, COL.TEBLIGATLAR);

export async function tebligatEkle(data: Omit<Tebligat, "id">): Promise<string> {
  const ref = await addDoc(col(), data);
  return ref.id;
}

export async function tebligatDurumGuncelle(id: string, durum: TebligatDurum): Promise<void> {
  await updateDoc(doc(db, COL.TEBLIGATLAR, id), { durum });
}

export async function tebligatSil(id: string): Promise<void> {
  await deleteDoc(doc(db, COL.TEBLIGATLAR, id));
}

export function tebligatlarDinle(cb: (list: Tebligat[]) => void) {
  return onSnapshot(
    query(col(), orderBy("tarih", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tebligat)))
  );
}

export function musteriTebligatlariDinle(musteriId: string, cb: (list: Tebligat[]) => void) {
  return onSnapshot(
    query(col(), where("musteriId", "==", musteriId), orderBy("tarih", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tebligat)))
  );
}
