import type { KullaniciYetki, UserRole } from "@/lib/types";

export const PERSONEL_DEFAULT_YETKILER: KullaniciYetki[] = [
  "portfoy_okuma",
  "musteri_yazma",
  "tahakkuk_yazma",
  "belge_yonetimi",
  "gib_okuma",
  "rapor_yonetimi",
];

export function defaultYetkilerForRole(role: UserRole): KullaniciYetki[] {
  if (role === "personel") return PERSONEL_DEFAULT_YETKILER;
  // musavir: hasPermission() zaten her zaman true döner, yetkiler listesine gerek yok
  return [];
}

export function createInviteToken() {
  // crypto.randomUUID() Next.js (browser + Node 14.17+) ortamlarında her zaman mevcuttur
  return crypto.randomUUID().replace(/-/g, "");
}

export async function hashInviteToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildInviteLink(token: string) {
  if (typeof window === "undefined") return `/davet/${token}`;
  return `${window.location.origin}/davet/${token}`;
}

export function inviteExpiry(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
