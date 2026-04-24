import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase/client";

export const COLLECTIONS = {
  ofisler: "ofisler",
  musteriler: "musteriler",
  mukellefiyetProfilleri: "mukellefiyetProfilleri",
  yukumlulukler: "yukumlulukler",
  gorevler: "gorevler",
  tebligatlar: "tebligatlar",
  beyannameler: "beyannameler",
  raporlar: "raporlar",
  bildirimler: "bildirimler",
  tahsilatlar: "tahsilatlar",
  tahakkuklar: "tahakkuklar",
  odemeler: "odemeler",
  davetler: "davetler",
  bankaEkstreleri: "bankaEkstreleri",
  resmiGazeteOzetleri: "resmiGazeteOzetleri",
  gibSyncLogs: "gibSyncLogs",
  kdv2: "kdv2",
  kullanicilar: "kullanicilar",
  gonderimler: "gonderimler",
  belgeler: "belgeler",
  auditLogs: "auditLogs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export type DataSource = "firebase" | "mock";

export interface SubscribeMeta {
  source: DataSource;
  error?: string;
}

function requireDb() {
  if (!firestoreDb) {
    throw new Error("Firebase yapılandırması bulunamadı. .env.local dosyasına Firebase bilgilerini ekleyin.");
  }
  return firestoreDb;
}

function withoutUndefined<T extends object>(data: T): DocumentData {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as DocumentData;
}

export function subscribeCollection<T extends { id: string }>(
  collectionName: CollectionName,
  fallback: T[],
  onData: (data: T[], meta: SubscribeMeta) => void
): Unsubscribe {
  if (!firestoreDb) {
    onData(fallback, { source: "mock" });
    return () => undefined;
  }

  return onSnapshot(
    collection(firestoreDb, collectionName),
    (snapshot) => {
      const data = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      })) as T[];

      onData(data, { source: "firebase" });
    },
    (error: FirestoreError) => {
      console.error(`[Firestore] ${collectionName} okunamadı`, error);
      onData(fallback, { source: "mock", error: error.message });
    }
  );
}

export async function upsertDocument<T extends { id: string }>(
  collectionName: CollectionName,
  data: T
) {
  const db = requireDb();
  await setDoc(doc(db, collectionName, data.id), withoutUndefined(data), { merge: true });
}

export async function updateDocument<T extends object>(
  collectionName: CollectionName,
  id: string,
  data: Partial<T>
) {
  const db = requireDb();
  await updateDoc(doc(db, collectionName, id), withoutUndefined(data));
}

export async function deleteDocument(collectionName: CollectionName, id: string) {
  const db = requireDb();
  await deleteDoc(doc(db, collectionName, id));
}

export async function seedCollection<T extends { id: string }>(
  collectionName: CollectionName,
  records: T[]
) {
  const db = requireDb();
  const batch = writeBatch(db);

  records.forEach((record) => {
    batch.set(doc(db, collectionName, record.id), withoutUndefined(record), { merge: true });
  });

  await batch.commit();
}

export async function countCollection(collectionName: CollectionName) {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.size;
}
