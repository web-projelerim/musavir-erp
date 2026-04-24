import type {
  Tebligat,
  TebligatAksiyonDurum,
  TebligatAksiyonTipi,
  TebligatOnemDerecesi,
} from "@/lib/types";

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR");
}

export function inferTebligatOnem(tebligat: Pick<Tebligat, "tur" | "baslik">): TebligatOnemDerecesi {
  const text = normalize(`${tebligat.tur} ${tebligat.baslik}`);
  if (/uzlasma|inceleme|ceza|haciz/.test(text)) return "kritik";
  if (/odeme|borc|eksik|bilgi/.test(text)) return "yuksek";
  return "normal";
}

export function inferTebligatAksiyonTipi(tebligat: Pick<Tebligat, "tur" | "baslik">): TebligatAksiyonTipi {
  const text = normalize(`${tebligat.tur} ${tebligat.baslik}`);
  if (/uzlasma/.test(text)) return "uzlasma_degerlendir";
  if (/odeme|borc/.test(text)) return "odeme_kontrol";
  if (/bilgi|adres/.test(text)) return "bilgi_tamamla";
  if (/inceleme|savunma|izahat/.test(text)) return "yanit_hazirla";
  return "incele";
}

export function ofisSlaGunSayisi(tebligat: Pick<Tebligat, "tur" | "baslik">) {
  const text = normalize(`${tebligat.tur} ${tebligat.baslik}`);
  if (/uzlasma|inceleme|ceza|haciz/.test(text)) return 3;
  if (/odeme|borc/.test(text)) return 5;
  if (/bilgi|adres/.test(text)) return 7;
  return 5;
}

export function buildTebligatSlaFields(tebligat: Tebligat): Partial<Tebligat> {
  const ulasmaTarihi = tebligat.ulasmaTarihi ?? tebligat.tarih;
  const tebligEdilmisSayilmaTarihi =
    tebligat.tebligEdilmisSayilmaTarihi ?? addDays(ulasmaTarihi, 5);
  const kritikSonTarih =
    tebligat.kritikSonTarih ?? addDays(tebligEdilmisSayilmaTarihi, ofisSlaGunSayisi(tebligat));

  return {
    ulasmaTarihi,
    tebligEdilmisSayilmaTarihi,
    kritikSonTarih,
    onemDerecesi: tebligat.onemDerecesi ?? inferTebligatOnem(tebligat),
    aksiyonTipi: tebligat.aksiyonTipi ?? inferTebligatAksiyonTipi(tebligat),
    aksiyonDurumu: tebligat.aksiyonDurumu ?? "bekliyor",
    aksiyonSahibi: tebligat.aksiyonSahibi ?? "Selin Kaya",
  };
}

export function tebligatKalanGun(tebligat: Pick<Tebligat, "kritikSonTarih">, today = new Date()) {
  if (!tebligat.kritikSonTarih) return null;
  const due = new Date(tebligat.kritikSonTarih);
  due.setHours(0, 0, 0, 0);
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

export function tebligatSlaLabel(kalanGun: number | null, aksiyonDurumu?: TebligatAksiyonDurum) {
  if (aksiyonDurumu === "tamamlandi") return "Aksiyon tamam";
  if (kalanGun === null) return "SLA hesaplanmadi";
  if (kalanGun < 0) return `${Math.abs(kalanGun)} gun gecti`;
  if (kalanGun === 0) return "Bugun son gun";
  return `${kalanGun} gun kaldi`;
}

export function tebligatSlaVariant(kalanGun: number | null, aksiyonDurumu?: TebligatAksiyonDurum) {
  if (aksiyonDurumu === "tamamlandi") return "success" as const;
  if (kalanGun === null) return "neutral" as const;
  if (kalanGun <= 0) return "danger" as const;
  if (kalanGun <= 2) return "warning" as const;
  return "info" as const;
}

export function tebligatAksiyonLabel(tip?: TebligatAksiyonTipi) {
  const map: Record<TebligatAksiyonTipi, string> = {
    incele: "Incele",
    yanit_hazirla: "Yanit Hazirla",
    odeme_kontrol: "Odeme Kontrol",
    uzlasma_degerlendir: "Uzlasma Degerlendir",
    bilgi_tamamla: "Bilgi Tamamla",
  };
  return tip ? map[tip] : "-";
}

export function tebligatAksiyonDurumLabel(durum?: TebligatAksiyonDurum) {
  const map: Record<TebligatAksiyonDurum, string> = {
    bekliyor: "Bekliyor",
    islemde: "Islemde",
    tamamlandi: "Tamamlandi",
  };
  return durum ? map[durum] : "-";
}
