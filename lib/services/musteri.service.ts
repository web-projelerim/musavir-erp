import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot, Timestamp, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COL } from "@/lib/firebase/collections";
import type { Musteri } from "@/lib/types";

const col = () => collection(db, COL.MUSTERILER);

export async function getMusteriler(): Promise<Musteri[]> {
  const snap = await getDocs(query(col(), orderBy("firmaAdi")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Musteri));
}

export async function getMusteri(id: string): Promise<Musteri | null> {
  const snap = await getDoc(doc(db, COL.MUSTERILER, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Musteri;
}

export async function musteriEkle(data: Omit<Musteri, "id">): Promise<string> {
  const ref = await addDoc(col(), { ...data, sonGuncelleme: serverTimestamp() });
  return ref.id;
}

export async function musteriGuncelle(id: string, data: Partial<Musteri>): Promise<void> {
  await updateDoc(doc(db, COL.MUSTERILER, id), {
    ...data,
    sonGuncelleme: serverTimestamp(),
  });
}

export async function musteriSil(id: string): Promise<void> {
  await deleteDoc(doc(db, COL.MUSTERILER, id));
}

export function musterilerDinle(cb: (list: Musteri[]) => void) {
  return onSnapshot(
    query(col(), orderBy("firmaAdi")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Musteri)))
  );
}

export function musteriDinle(id: string, cb: (m: Musteri | null) => void) {
  return onSnapshot(doc(db, COL.MUSTERILER, id), (snap) =>
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Musteri) : null)
  );
}
