import type {
  BeyanPeriyot,
  MukellefiyetProfili,
  Musteri,
  Yukumluluk,
  YukumlulukDurumu,
  YukumlulukTipi,
} from "@/lib/types";

const DEFAULT_OFFICE_ID = "ofis-default";
const MONTH_NAMES = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

function inferSirketTuru(firmaAdi: string): MukellefiyetProfili["sirketTuru"] {
  const normalized = firmaAdi.toLocaleLowerCase("tr-TR");
  if (normalized.includes("a.s")) return "anonim";
  if (normalized.includes("ltd")) return "limited";
  if (normalized.includes("sahis")) return "sahis";
  return "diger";
}

function formatDonem(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dueDateFor(referenceDate: Date, dayOfMonth: number, monthOffset = 0) {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + monthOffset, dayOfMonth);
}

function durumForDate(sonTarih: string, today = new Date()): YukumlulukDurumu {
  const due = new Date(sonTarih);
  const base = new Date(today);
  due.setHours(0, 0, 0, 0);
  base.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "gecikti";
  if (diff <= 3) return "hazirlaniyor";
  return "bekliyor";
}

function buildAciklama(tip: YukumlulukTipi, musteri: Musteri) {
  const map: Record<YukumlulukTipi, string> = {
    kdv: `${musteri.firmaAdi} icin KDV beyan hazirligi ve evrak kontrolu yapilmali.`,
    muhtasar: `${musteri.firmaAdi} icin Muhtasar sureci ve personel verileri kontrol edilmeli.`,
    gecici_vergi: `${musteri.firmaAdi} icin gecici vergi/tahakkuk takibi planlandi.`,
    sgk: `${musteri.firmaAdi} icin SGK ve calisan bildirimleri kontrol edilmeli.`,
  };
  return map[tip];
}

export function buildMukellefiyetProfiliFromMusteri(
  musteri: Musteri,
  referenceDate = new Date()
): MukellefiyetProfili {
  const stamp = referenceDate.toISOString();
  const sirketTuru = inferSirketTuru(musteri.firmaAdi);

  return {
    id: `mp-${musteri.id}`,
    ofisId: musteri.ofisId ?? DEFAULT_OFFICE_ID,
    musteriId: musteri.id,
    musteriAdi: musteri.firmaAdi,
    sirketTuru,
    kdvPeriyot: musteri.kdvMukellef ? "aylik" : "yok",
    muhtasarPeriyot: musteri.muhtasarMukellef ? "aylik" : "yok",
    geciciVergiTakibi: musteri.gecikmisPesinat || sirketTuru !== "sahis",
    sgkTakibi: musteri.muhtasarMukellef,
    eTebligatAktif: musteri.durum === "aktif",
    durum: musteri.durum,
    kaynak: "sistem",
    notlar: musteri.gecikmisPesinat ? "Gecikmis pesinat/gecici vergi sinyali mevcut." : undefined,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function createYukumluluk(
  musteri: Musteri,
  profil: MukellefiyetProfili,
  tip: YukumlulukTipi,
  sonTarih: Date,
  referenceDate: Date
): Yukumluluk {
  return {
    id: `yuk-${musteri.id}-${tip}-${referenceDate.getFullYear()}-${referenceDate.getMonth() + 1}`,
    ofisId: musteri.ofisId ?? DEFAULT_OFFICE_ID,
    musteriId: musteri.id,
    musteriAdi: musteri.firmaAdi,
    profilId: profil.id,
    tip,
    donem: formatDonem(referenceDate),
    sonTarih: isoDate(sonTarih),
    durum: musteri.durum === "pasif" ? "pasif" : durumForDate(isoDate(sonTarih), referenceDate),
    sorumlu: musteri.sorumluPersonel,
    kaynak: "sistem",
    aciklama: buildAciklama(tip, musteri),
    createdAt: referenceDate.toISOString(),
  };
}

export function buildYukumluluklerForMusteri(
  musteri: Musteri,
  referenceDate = new Date(),
  profil = buildMukellefiyetProfiliFromMusteri(musteri, referenceDate)
): Yukumluluk[] {
  const list: Yukumluluk[] = [];

  if (profil.kdvPeriyot !== "yok") {
    list.push(createYukumluluk(musteri, profil, "kdv", dueDateFor(referenceDate, 26), referenceDate));
  }

  if (profil.muhtasarPeriyot !== "yok") {
    list.push(
      createYukumluluk(musteri, profil, "muhtasar", dueDateFor(referenceDate, 27), referenceDate)
    );
  }

  if (profil.geciciVergiTakibi) {
    list.push(
      createYukumluluk(
        musteri,
        profil,
        "gecici_vergi",
        dueDateFor(referenceDate, 17, 1),
        referenceDate
      )
    );
  }

  if (profil.sgkTakibi) {
    list.push(createYukumluluk(musteri, profil, "sgk", dueDateFor(referenceDate, 23), referenceDate));
  }

  return list;
}

export function yukumlulukTipLabel(tip: YukumlulukTipi) {
  const map: Record<YukumlulukTipi, string> = {
    kdv: "KDV",
    muhtasar: "Muhtasar",
    gecici_vergi: "Gecici Vergi",
    sgk: "SGK",
  };
  return map[tip];
}

export function beyanPeriyotLabel(periyot: BeyanPeriyot) {
  const map: Record<BeyanPeriyot, string> = {
    aylik: "Aylik",
    uc_aylik: "Uc Aylik",
    yillik: "Yillik",
    yok: "Yok",
  };
  return map[periyot];
}

export function yukumlulukVariant(durum: YukumlulukDurumu) {
  if (durum === "tamamlandi") return "success" as const;
  if (durum === "hazirlaniyor") return "warning" as const;
  if (durum === "gecikti") return "danger" as const;
  if (durum === "pasif") return "neutral" as const;
  return "info" as const;
}
