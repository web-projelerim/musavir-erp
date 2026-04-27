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

async function getPublicKeys(): Promise<Record<string, string>> {
  if (Date.now() < cacheExpiry) return cachedKeys;
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
  if (payload.exp < now) throw new Error("Token süresi dolmuş");
  if (payload.aud !== PROJECT_ID) throw new Error("Geçersiz token hedefi");
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error("Geçersiz token kaynağı");

  const keys = await getPublicKeys();
  const cert = keys[header.kid];
  if (!cert) throw new Error("Bilinmeyen anahtar ID");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  const valid = verifier.verify(cert, Buffer.from(sigB64, "base64url"));
  if (!valid) throw new Error("Geçersiz token imzası");

  return { uid: payload.uid ?? payload.sub, email: payload.email };
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
