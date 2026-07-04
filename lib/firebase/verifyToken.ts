/**
 * Server-side Firebase ID token verification.
 * Google'ın public key endpoint'ini kullanır — firebase-admin service account gerekmez.
 */

import { createVerify } from "crypto";

const JWKS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

let cachedKeys: Record<string, string> = {};
let cacheExpiry = 0;

async function getPublicKeys(force = false): Promise<Record<string, string>> {
  if (!force && Date.now() < cacheExpiry) return cachedKeys;
  const res = await fetch(JWKS_URL);
  const maxAge = parseInt(res.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? "3600");
  cachedKeys = await res.json();
  cacheExpiry = Date.now() + maxAge * 1000;
  return cachedKeys;
}

export interface VerifiedToken {
  uid: string;
  email?: string;
}

export async function verifyFirebaseToken(token: string): Promise<VerifiedToken> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Geçersiz token formatı");
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

  const now = Math.floor(Date.now() / 1000);
  const CLOCK_SKEW = 300; // 5 dk tolerans
  if (!PROJECT_ID) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID tanımlı değil");
  if (typeof payload.exp !== "number" || payload.exp < now) throw new Error("Token süresi dolmuş");
  if (typeof payload.iat !== "number" || payload.iat > now + CLOCK_SKEW) throw new Error("Token henüz geçerli değil (iat)");
  if (typeof payload.auth_time !== "number" || payload.auth_time > now + CLOCK_SKEW) throw new Error("Geçersiz auth_time");
  if (payload.aud !== PROJECT_ID) throw new Error("Geçersiz token hedefi");
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error("Geçersiz token kaynağı");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Geçersiz subject (sub)");

  let keys = await getPublicKeys();
  let cert = keys[header.kid];
  if (!cert) {
    // Google anahtarları rotasyona girmiş olabilir — cache'i zorla yenile ve bir kez daha dene.
    keys = await getPublicKeys(true);
    cert = keys[header.kid];
  }
  if (!cert) throw new Error("Bilinmeyen anahtar ID");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  const valid = verifier.verify(cert, Buffer.from(sigB64, "base64url"));
  if (!valid) throw new Error("Geçersiz token imzası");

  return { uid: payload.sub, email: payload.email };
}

/** Request header'dan token çıkar ve doğrula. Başarısızsa null döner. */
export async function requireAuth(
  req: Request
): Promise<VerifiedToken | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return await verifyFirebaseToken(auth.slice(7));
  } catch {
    return null;
  }
}

// ─── Rol bazlı yetkilendirme ───────────────────────────────────────────────────

export type StaffRole = "musavir" | "personel";

export interface VerifiedStaff extends VerifiedToken {
  rol: StaffRole;
  ofisId: string;
}

/**
 * Token doğrulamasının ÜZERİNE Firestore'daki kullanıcı kaydından rol/ofis
 * kontrolü yapar. Yalnızca musavir/personel rolündeki kullanıcılar geçer.
 *
 * Rol bilgisi Admin SDK ile okunur (istemci kurallarından bağımsız, güvenilir).
 * FIREBASE_SERVICE_ACCOUNT_KEY yapılandırılmamışsa:
 *   - production → fail-closed (null döner, endpoint 401/503 vermeli)
 *   - development → yalnızca kimlik doğrulamasıyla devam eder (uyarı loglanır)
 */
export async function requireStaff(
  req: Request,
  options?: { allowedRoles?: StaffRole[] }
): Promise<VerifiedStaff | null> {
  const token = await requireAuth(req);
  if (!token) return null;

  const { getAdminDb } = await import("@/lib/firebase/admin");
  const db = getAdminDb();

  if (!db) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[requireStaff] FIREBASE_SERVICE_ACCOUNT_KEY yapılandırılmamış — production'da rol doğrulaması yapılamıyor, istek reddedildi."
      );
      return null;
    }
    console.warn(
      "[requireStaff] Admin SDK yok (dev ortamı) — rol kontrolü atlanıyor. Production'da FIREBASE_SERVICE_ACCOUNT_KEY zorunludur."
    );
    return { ...token, rol: "musavir", ofisId: token.uid };
  }

  const snap = await db.collection("kullanicilar").doc(token.uid).get();
  if (!snap.exists) return null;

  const data = snap.data() as { rol?: string; ofisId?: string; aktif?: boolean };
  const allowed = options?.allowedRoles ?? ["musavir", "personel"];

  if (data.aktif === false) return null;
  if (!data.rol || !allowed.includes(data.rol as StaffRole)) return null;
  if (!data.ofisId) return null;

  return { ...token, rol: data.rol as StaffRole, ofisId: data.ofisId };
}
