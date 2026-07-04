import type { KullaniciYetki, UserRole } from "@/lib/types";

/** Tüm atanabilir yetkiler ve UI etiketleri (davet modalı + kullanıcı yönetimi). */
export const YETKI_LABELS: Record<KullaniciYetki, string> = {
  portfoy_okuma: "Portföy görüntüleme",
  musteri_yazma: "Müşteri ekleme/düzenleme",
  tahakkuk_yazma: "Tahakkuk işlemleri",
  belge_yonetimi: "Belge yönetimi",
  gib_okuma: "GİB verisi görüntüleme",
  rapor_yonetimi: "Rapor yönetimi",
  vkn_goruntule: "VKN/TCKN açık görüntüleme",
};

export const TUM_YETKILER = Object.keys(YETKI_LABELS) as KullaniciYetki[];

export const PERSONEL_DEFAULT_YETKILER: KullaniciYetki[] = [
  "portfoy_okuma",
  "musteri_yazma",
  "tahakkuk_yazma",
  "belge_yonetimi",
  "gib_okuma",
  "rapor_yonetimi",
  // "vkn_goruntule" bilinçli olarak varsayılanda YOK — güvenli varsayılan maskeli
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
