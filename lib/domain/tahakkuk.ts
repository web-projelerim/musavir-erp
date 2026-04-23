import type { Tahakkuk, TahakkukDurum } from "@/lib/types";

export function calculateTahakkukDurum(tahakkuk: Pick<Tahakkuk, "tutar" | "odenenTutar" | "vadeTarihi" | "durum">): TahakkukDurum {
  if (tahakkuk.durum === "iptal" || tahakkuk.durum === "taslak") return tahakkuk.durum;

  const paid = tahakkuk.odenenTutar ?? 0;
  if (paid >= tahakkuk.tutar) return "odendi";
  if (paid > 0) return "kismi";

  const today = new Date().toISOString().slice(0, 10);
  if (tahakkuk.vadeTarihi < today) return "gecikti";
  return "bekliyor";
}

export function buildTahakkukPanelLink(musteriId: string) {
  return `/panel?tahakkuk=${encodeURIComponent(musteriId)}`;
}

export function buildTahakkukWhatsAppMessage(input: {
  firmaAdi: string;
  donem: string;
  tutar: number;
  panelLinki: string;
}) {
  return `Sayin ${input.firmaAdi}, ${input.donem} donemi icin panel uzerinden guncel tahakkukunuz tanimlanmistir. Lutfen kontrol ediniz: ${input.panelLinki}`;
}
