import type { Belge, BelgeVersiyon } from "@/lib/types";

/**
 * Bir belgeye yeni versiyon ekler. Mevcut aktif içerik geçmişe taşınır,
 * yeni içerik aktif alanlara (url/storagePath/boyut) yazılır ve versiyon
 * numarası artar. Saf fonksiyon — Firestore güncellemesi çağıran katmanda.
 */
export function yeniVersiyonEkle(
  belge: Belge,
  yeni: { url: string; storagePath?: string; boyut: number; yukleyen: string; not?: string }
): Pick<Belge, "url" | "storagePath" | "boyut" | "versiyon" | "versiyonlar"> {
  const mevcutVersiyon = belge.versiyon ?? 1;
  const gecmis: BelgeVersiyon[] = belge.versiyonlar ? [...belge.versiyonlar] : [];

  // Mevcut aktif içeriği geçmişe al (ilk kez versiyonlanıyorsa v1 olarak)
  gecmis.push({
    versiyon: mevcutVersiyon,
    url: belge.url,
    storagePath: belge.storagePath,
    boyut: belge.boyut,
    yukleyen: belge.yukleyen,
    createdAt: belge.createdAt,
  });

  return {
    url: yeni.url,
    storagePath: yeni.storagePath,
    boyut: yeni.boyut,
    versiyon: mevcutVersiyon + 1,
    versiyonlar: gecmis,
  };
}

/** Belgenin tüm versiyonları (geçmiş + aktif), en yeni başta. */
export function tumVersiyonlar(belge: Belge): BelgeVersiyon[] {
  const aktif: BelgeVersiyon = {
    versiyon: belge.versiyon ?? 1,
    url: belge.url,
    storagePath: belge.storagePath,
    boyut: belge.boyut,
    yukleyen: belge.yukleyen,
    createdAt: belge.createdAt,
  };
  const gecmis = belge.versiyonlar ?? [];
  return [aktif, ...gecmis].sort((a, b) => b.versiyon - a.versiyon);
}

/** Onay bekleyen belge mi? (mükellef yüklemesi, henüz onaylanmamış) */
export function onayBekliyorMu(belge: Belge): boolean {
  return belge.onayDurum === "bekliyor";
}

/** Onay güncellemesi için patch üretir. */
export function onayGuncelle(
  onayla: boolean,
  onaylayan: string,
  not?: string
): Pick<Belge, "onayDurum" | "onaylayan" | "onayTarihi" | "onayNotu"> {
  return {
    onayDurum: onayla ? "onaylandi" : "reddedildi",
    onaylayan,
    onayTarihi: new Date().toISOString(),
    ...(not ? { onayNotu: not } : {}),
  };
}
