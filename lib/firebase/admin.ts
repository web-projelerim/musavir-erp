import "server-only";

/**
 * Firebase Admin SDK — sadece sunucu tarafı API route'larında kullanılır.
 * Client bundle'a dahil edilmez.
 *
 * Gerekli env:
 *   FIREBASE_SERVICE_ACCOUNT_KEY  — service account JSON'ı (base64 veya ham JSON string)
 *
 * Firebase Console → Proje Ayarları → Hizmet Hesapları → Yeni özel anahtar oluştur
 * Base64'e çevirmek için: base64 -i serviceAccount.json (Mac/Linux)
 * Vercel'e eklemek için: Settings → Environment Variables
 */

import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "musavir-admin";

function initAdminApp() {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    const json = raw.trimStart().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf-8");
    const sa = JSON.parse(json) as ServiceAccount;
    return initializeApp({ credential: cert(sa) }, APP_NAME);
  } catch (err) {
    console.error("[Firebase Admin] Başlatma hatası:", err);
    return null;
  }
}

let _db: Firestore | null = null;

export function getAdminDb(): Firestore | null {
  if (_db) return _db;
  const app = initAdminApp();
  if (!app) return null;
  _db = getFirestore(app);
  return _db;
}

/** Firestore'a merge-set (upsert) — undefined değerleri siler */
export async function adminUpsert(
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin yapılandırması eksik (FIREBASE_SERVICE_ACCOUNT_KEY)");
  const clean = stripUndefined(data);
  await db.collection(collection).doc(id).set(clean, { merge: true });
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      result[k] = stripUndefined(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}
