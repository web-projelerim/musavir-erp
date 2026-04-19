import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COL } from "@/lib/firebase/collections";
import type { Gorev, GorevDurum } from "@/lib/types";

const col = () => collection(db, COL.GOREVLER);

export async function gorevEkle(data: Omit<Gorev, "id">): Promise<string> {
  const ref = await addDoc(col(), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function gorevGuncelle(id: string, data: Partial<Gorev>): Promise<void> {
  await updateDoc(doc(db, COL.GOREVLER, id), data);
}

export async function gorevDurumGuncelle(id: string, durum: GorevDurum): Promise<void> {
  const update: Partial<Gorev> = { durum };
  if (durum === "tamamlandi") update.tamamlanmaTarihi = new Date().toISOString();
  await updateDoc(doc(db, COL.GOREVLER, id), update);
}

export async function gorevSil(id: string): Promise<void> {
  await deleteDoc(doc(db, COL.GOREVLER, id));
}

export function gorevlerDinle(cb: (list: Gorev[]) => void) {
  return onSnapshot(
    query(col(), orderBy("terminTarihi")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Gorev)))
  );
}

export function musteriGorevleriDinle(musteriId: string, cb: (list: Gorev[]) => void) {
  return onSnapshot(
    query(col(), where("musteriId", "==", musteriId), orderBy("terminTarihi")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Gorev)))
  );
}
