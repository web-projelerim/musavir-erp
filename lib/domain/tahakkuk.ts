import type {
  Beyanname,
  HizmetTuru,
  Tahakkuk,
  TahakkukDurum,
  TahakkukTuru,
  VergiTahakkukTuru,
} from "@/lib/types";

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

export function tahakkukTuruLabel(tur: TahakkukTuru) {
  return tur === "vergi" ? "Vergi Tahakkuku" : "Hizmet Tahakkuku";
}

export function hizmetTuruLabel(tur?: HizmetTuru) {
  const map: Record<HizmetTuru, string> = {
    mali_musavirlik: "Mali Musavirlik",
    beyanname: "Beyanname",
    danismanlik: "Danismanlik",
    diger: "Diger",
  };

  return tur ? map[tur] : "-";
}

export function vergiTuruLabel(tur?: VergiTahakkukTuru) {
  const map: Record<VergiTahakkukTuru, string> = {
    KDV: "KDV",
    MUHTASAR: "Muhtasar",
    GECICI_VERGI: "Gecici Vergi",
    KURUMLAR: "Kurumlar Vergisi",
    GELIR: "Gelir Vergisi",
    DAMGA: "Damga Vergisi",
    SGK: "SGK",
    DIGER: "Diger",
  };

  return tur ? map[tur] : "-";
}

export function tahakkukKalemLabel(tahakkuk: Pick<Tahakkuk, "tahakkukTuru" | "hizmetTuru" | "vergiTuru">) {
  return tahakkuk.tahakkukTuru === "vergi"
    ? vergiTuruLabel(tahakkuk.vergiTuru)
    : hizmetTuruLabel(tahakkuk.hizmetTuru);
}

export function isVergiTahakkuku(tahakkuk: Pick<Tahakkuk, "tahakkukTuru">) {
  return tahakkuk.tahakkukTuru === "vergi";
}

export function beyannameToVergiTuru(tur: Beyanname["tur"]): VergiTahakkukTuru {
  const map: Record<Beyanname["tur"], VergiTahakkukTuru> = {
    KDV: "KDV",
    MUHTAS: "MUHTASAR",
    KURUM: "KURUMLAR",
    GELIR: "GELIR",
    GECICI: "GECICI_VERGI",
    DIGER: "DIGER",
  };

  return map[tur];
}

export function canDeriveVergiTahakkuk(beyanname: Beyanname) {
  const workflowReady =
    beyanname.yasamDongusuDurum === "tahakkuk_olustu" ||
    beyanname.yasamDongusuDurum === "odeme_bekliyor" ||
    beyanname.yasamDongusuDurum === "kapandi";

  return Boolean(
    workflowReady &&
      beyanname.vergiTutari &&
      beyanname.vergiTutari > 0 &&
      (beyanname.tahakkukFisNo || beyanname.tahakkukFisTarihi)
  );
}

export function buildVergiTahakkukFromBeyanname(beyanname: Beyanname): Tahakkuk | null {
  if (!canDeriveVergiTahakkuk(beyanname)) return null;

  const odenmis = beyanname.yasamDongusuDurum === "kapandi";
  const tutar = beyanname.vergiTutari ?? 0;
  const durum: TahakkukDurum = odenmis ? "odendi" : "bekliyor";

  return {
    id: `derived-${beyanname.id}`,
    ofisId: beyanname.ofisId ?? "ofis-default",
    musteriId: beyanname.musteriId,
    musteriAdi: beyanname.musteriAdi,
    donem: beyanname.donem,
    tahakkukTuru: "vergi",
    vergiTuru: beyannameToVergiTuru(beyanname.tur),
    kaynakBeyannameId: beyanname.id,
    resmiTahakkukFisNo: beyanname.tahakkukFisNo,
    kaynakSistem: beyanname.kaynakSistem,
    otomatikTuretilmis: true,
    tutar,
    odenenTutar: odenmis ? tutar : 0,
    vadeTarihi: beyanname.odemeSonTarihi ?? beyanname.sonTarih,
    durum,
    bildirimDurumu: "kapali",
    panelLinki: buildTahakkukPanelLink(beyanname.musteriId),
    aciklama: `${beyanname.donem} donemi ${vergiTuruLabel(beyannameToVergiTuru(beyanname.tur))} tahakkuku beyannameden turetildi`,
    createdBy: "system",
    createdAt:
      beyanname.tahakkukFisTarihi ??
      beyanname.verilmeTarihi ??
      new Date().toISOString(),
  };
}

export function mergeDerivedVergiTahakkuklari(tahakkuklar: Tahakkuk[], beyannameler: Beyanname[]) {
  const derived = beyannameler
    .map((beyanname) => buildVergiTahakkukFromBeyanname(beyanname))
    .filter((item): item is Tahakkuk => Boolean(item))
    .filter((candidate) => {
      return !tahakkuklar.some((existing) => {
        if (existing.kaynakBeyannameId && existing.kaynakBeyannameId === candidate.kaynakBeyannameId) return true;
        if (existing.resmiTahakkukFisNo && candidate.resmiTahakkukFisNo && existing.resmiTahakkukFisNo === candidate.resmiTahakkukFisNo) return true;
        return (
          existing.tahakkukTuru === "vergi" &&
          existing.musteriId === candidate.musteriId &&
          existing.donem === candidate.donem &&
          existing.vergiTuru === candidate.vergiTuru
        );
      });
    });

  return [...tahakkuklar, ...derived];
}

export function buildTahakkukWhatsAppMessage(input: {
  firmaAdi: string;
  donem: string;
  tutar: number;
  panelLinki: string;
}) {
  return `Sayin ${input.firmaAdi}, ${input.donem} donemi icin panel uzerinden guncel tahakkukunuz tanimlanmistir. Lutfen kontrol ediniz: ${input.panelLinki}`;
}
