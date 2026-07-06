import type {
  Beyanname,
  HizmetTuru,
  Tahakkuk,
  TahakkukDurum,
  TahakkukTuru,
  VergiTahakkukTuru,
  WhatsAppEntegrasyonAyari,
} from "@/lib/types";
import { mesajOlustur } from "@/lib/domain/mesajSablonlari";
import { formatPara } from "@/lib/utils/format";

export interface TurmobHesabi {
  brut: number;
  net: number;
  kdv: number;
  stopaj: number;
  tahsil: number;
  kdvOran: number;
  stopajOran: number;
}

/**
 * Türmob hesabı: KDV dahil brüt tutardan net (matrah), KDV, stopaj ve tahsil
 * edilecek tutarı türetir. Sadece "hizmet" tahakkukları (mali müşavirlik ücreti
 * gibi serbest meslek makbuzu mantığındaki kalemler) için anlamlıdır — "vergi"
 * tahakkukları (KDV/Muhtasar/... borcu) zaten net vergi tutarıdır.
 *
 * Formül: net = brüt / (1 + kdvOranı/100); stopaj = net * stopajOranı/100
 * (stopaj KDV hariç matrah üzerinden hesaplanır — KDV üzerinden değil);
 * tahsil edilecek = brüt - stopaj.
 */
export function hesaplaTurmobTutarlari(input: {
  brut: number;
  kdvOrani: number;
  stopajUygula: boolean;
  stopajOrani: number;
}): TurmobHesabi | null {
  const { brut, kdvOrani, stopajUygula, stopajOrani } = input;
  if (!Number.isFinite(brut) || brut <= 0) return null;
  const kdvOran = Number.isFinite(kdvOrani) ? kdvOrani : 0;
  const stopajOran = stopajUygula && Number.isFinite(stopajOrani) ? stopajOrani : 0;
  const net = brut / (1 + kdvOran / 100);
  const kdv = brut - net;
  const stopaj = net * (stopajOran / 100);
  const tahsil = brut - stopaj;
  return { brut, net, kdv, stopaj, tahsil, kdvOran, stopajOran };
}

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

export function buildTahakkukWhatsAppMessage(
  input: {
    firmaAdi: string;
    donem: string;
    tutar: number;
    panelLinki: string;
  },
  ayar?: WhatsAppEntegrasyonAyari
) {
  return mesajOlustur("tahakkuk", ayar, {
    firma_adi: input.firmaAdi,
    donem: input.donem,
    tutar: formatPara(input.tutar),
    panel_linki: input.panelLinki,
  });
}
