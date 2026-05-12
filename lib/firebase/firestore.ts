import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
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
  gibEntegrasyonAyarlari: "gibEntegrasyonAyarlari",
  lucaEntegrasyonAyarlari: "lucaEntegrasyonAyarlari",
  whatsappEntegrasyonAyarlari: "whatsappEntegrasyonAyarlari",
  bankaEntegrasyonAyarlari: "bankaEntegrasyonAyarlari",
  emailEntegrasyonAyarlari: "emailEntegrasyonAyarlari",
  entegrasyonLoglari: "entegrasyonLoglari",
  notlar: "notlar",
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

export function withoutUndefined<T extends object>(data: T): DocumentData {
  const result: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = withoutUndefined(value as object);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function subscribeDocById<T extends { id: string }>(
  collectionName: CollectionName,
  docId: string,
  onData: (data: T | null, meta: SubscribeMeta) => void
): Unsubscribe {
  if (!firestoreDb || !docId) {
    onData(null, { source: "mock" });
    return () => undefined;
  }

  return onSnapshot(
    doc(firestoreDb, collectionName, docId),
    (snapshot) => {
      onData(
        snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null,
        { source: "firebase" }
      );
    },
    (error: FirestoreError) => {
      console.error(`[Firestore] ${collectionName}/${docId} okunamadı`, error);
      onData(null, { source: "mock", error: error.message });
    }
  );
}

export function subscribeCollection<T extends { id: string }>(
  collectionName: CollectionName,
  fallback: T[],
  onData: (data: T[], meta: SubscribeMeta) => void,
  ofisId?: string
): Unsubscribe {
  if (!firestoreDb) {
    onData(fallback, { source: "mock" });
    return () => undefined;
  }

  const ref = ofisId
    ? query(collection(firestoreDb, collectionName), where("ofisId", "==", ofisId))
    : collection(firestoreDb, collectionName);

  return onSnapshot(
    ref,
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

/**
 * Bir nota tikleyen ekler (arrayUnion ile idempotent).
 */
export async function tikleNot(
  notId: string,
  tikleyen: { email: string; ad: string; tarih: string }
): Promise<void> {
  if (!firestoreDb) return;
  await updateDoc(doc(firestoreDb, COLLECTIONS.notlar, notId), {
    tikleyenler: arrayUnion(tikleyen),
  });
}

/**
 * Kullanıcının kendi tikini nottan kaldırır.
 * email eşleşen tüm tikleyenler kaldırılır (tarih fark etmeksizin).
 */
export async function untikleNot(
  notId: string,
  mevcutTikleyenler: { email: string; ad: string; tarih: string }[],
  email: string
): Promise<void> {
  if (!firestoreDb) return;
  const kaldirilacaklar = mevcutTikleyenler.filter((t) => t.email === email);
  if (kaldirilacaklar.length === 0) return;
  const ref = doc(firestoreDb, COLLECTIONS.notlar, notId);
  // arrayRemove her öğeyi tek tek kaldır (Firestore deep equality gerektirir)
  for (const t of kaldirilacaklar) {
    await updateDoc(ref, { tikleyenler: arrayRemove(t) });
  }
}

/**
 * Kullanıcının kendi yazdığı notları dinler (createdBy == uid).
 */
export function subscribeNotlarByCreator<T extends { id: string }>(
  uid: string,
  onData: (data: T[], meta: SubscribeMeta) => void
): Unsubscribe {
  if (!firestoreDb || !uid) {
    onData([], { source: "mock" });
    return () => undefined;
  }

  const ref = query(
    collection(firestoreDb, COLLECTIONS.notlar),
    where("createdBy", "==", uid)
  );

  return onSnapshot(
    ref,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
      onData(data, { source: "firebase" });
    },
    (error: FirestoreError) => {
      console.error("[Firestore] notlar (createdBy) okunamadı", error);
      onData([], { source: "mock", error: error.message });
    }
  );
}

/**
 * `paylasilanEmails` array-contains sorgusyla notları dinler.
 * Kullanıcının e-postası bir notun paylasilanEmails listesindeyse o notu alır.
 */
export function subscribeNotlarByEmail<T extends { id: string }>(
  email: string,
  onData: (data: T[], meta: SubscribeMeta) => void
): Unsubscribe {
  if (!firestoreDb || !email) {
    onData([], { source: "mock" });
    return () => undefined;
  }

  const ref = query(
    collection(firestoreDb, COLLECTIONS.notlar),
    where("paylasilanEmails", "array-contains", email)
  );

  return onSnapshot(
    ref,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
      onData(data, { source: "firebase" });
    },
    (error: FirestoreError) => {
      console.error("[Firestore] notlar (email) okunamadı", error);
      onData([], { source: "mock", error: error.message });
    }
  );
}
