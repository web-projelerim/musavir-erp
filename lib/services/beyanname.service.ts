import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COL } from "@/lib/firebase/collections";
import type { Beyanname, BeyannameDurum } from "@/lib/types";

const col = () => collection(db, COL.BEYANNAMELER);

export async function beyannameEkle(data: Omit<Beyanname, "id">): Promise<string> {
  const ref = await addDoc(col(), data);
  return ref.id;
}

export async function beyannameDurumGuncelle(id: string, durum: BeyannameDurum): Promise<void> {
  const update: Partial<Beyanname> = { durum };
  if (durum === "verildi") update.verilmeTarihi = new Date().toISOString();
  await updateDoc(doc(db, COL.BEYANNAMELER, id), update);
}

export async function beyannameSil(id: string): Promise<void> {
  await deleteDoc(doc(db, COL.BEYANNAMELER, id));
}

export function beyannamelerDinle(cb: (list: Beyanname[]) => void) {
  return onSnapshot(
    query(col(), orderBy("sonTarih")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Beyanname)))
  );
}

export function musteriBeyannameleriniDinle(musteriId: string, cb: (list: Beyanname[]) => void) {
  return onSnapshot(
    query(col(), where("musteriId", "==", musteriId), orderBy("sonTarih", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Beyanname)))
  );
}
