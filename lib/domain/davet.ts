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
  if (role === "musavir") return PERSONEL_DEFAULT_YETKILER;
  return [];
}

export function createInviteToken() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return btoa(randomPart).replace(/=+$/g, "").replace(/[+/]/g, "-").slice(0, 32);
}

export function hashInviteToken(token: string) {
  return btoa(token).replace(/=+$/g, "");
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
