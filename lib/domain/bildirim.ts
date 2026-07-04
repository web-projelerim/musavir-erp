import type { BildirimTip, User } from "@/lib/types";

/** Bildirim tiplerinin UI etiketleri (Ayarlar → Bildirim Tercihleri). */
export const BILDIRIM_TIP_LABELS: Record<BildirimTip, string> = {
  beyanname: "Beyanname bildirimleri",
  tebligat: "Tebligat bildirimleri",
  gorev: "Görev bildirimleri",
  rapor: "Rapor bildirimleri",
  tahsilat: "Tahsilat bildirimleri",
  sistem: "Sistem bildirimleri",
};

export const TUM_BILDIRIM_TIPLERI = Object.keys(BILDIRIM_TIP_LABELS) as BildirimTip[];

/**
 * Kullanıcı bu tipteki panel bildirimlerini görmek istiyor mu?
 * Varsayılan AÇIK: tercih hiç kaydedilmemişse veya tip tanımsızsa true döner —
 * böylece mevcut kullanıcılar için davranış değişmez.
 */
export function isBildirimEnabled(user: User | null | undefined, tip: BildirimTip): boolean {
  if (!user?.bildirimTercihleri) return true;
  return user.bildirimTercihleri[tip] !== false;
}
