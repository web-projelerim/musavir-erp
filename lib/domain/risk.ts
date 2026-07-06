import type {
  Beyanname,
  Gorev,
  KDV2Hesaplama,
  Musteri,
  RiskSeviyesi,
  Tahakkuk,
  Tahsilat,
  Tebligat,
} from "@/lib/types";
import { buildTebligatSlaFields, karsitIncelemeMi } from "@/lib/domain/tebligatSla";

export interface HesaplanmisRiskSinyali {
  tip:
    | "islenmemis_tebligat"
    | "gecikmis_beyanname"
    | "gecikmis_tahsilat"
    | "gecikmis_tahakkuk"
    | "gecikmis_pesinat"
    | "gecikmis_gorev"
    | "kritik_gorev"
    | "kdv2_kontrol"
    | "yaklasan_vade"
    | "karsit_inceleme"
    | "gecikmis_tebligat_yaniti";
  label: string;
  aciklama: string;
  puan: number;
  renk: string;
  adet?: number;
}

export interface HesaplanmisRisk {
  musteri: Musteri;
  skor: number;
  seviye: RiskSeviyesi;
  sinyaller: HesaplanmisRiskSinyali[];
  /** Yaklaşan (henüz geçmemiş) işler içinde vadeye en az gün kalan.
   *  Yaklaşan iş yoksa undefined. 0 = bugün, 1 = yarın. Gösterimde "en acil"
   *  vurgusu (yanıp sönme) için kullanılır. */
  enYakinVadeGun?: number;
}

export interface RiskHesaplamaInput {
  musteriler: Musteri[];
  tebligatlar: Tebligat[];
  beyannameler: Beyanname[];
  gorevler: Gorev[];
  tahsilatlar: Tahsilat[];
  tahakkuklar?: Tahakkuk[];
  kdv2?: KDV2Hesaplama[];
}

export interface MusteriRiskHesaplamaInput extends Omit<RiskHesaplamaInput, "musteriler"> {
  musteri: Musteri;
}

const tamamlanmisGorevDurumlari = new Set<Gorev["durum"]>(["tamamlandi", "iptal"]);

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function gecmisTarihMi(value?: string, now = new Date()) {
  const date = parseDate(value);
  return !!date && date.getTime() < now.getTime();
}

function sinyalPuani(base: number, adet: number, ekstra: number, max: number) {
  if (adet <= 0) return 0;
  return Math.min(max, base + Math.max(0, adet - 1) * ekstra);
}

/** Vadeye kalan gün sayısına göre aciliyet puanı.
 *  Yarın bitecek tek iş → 50 puan; 1 ay sonrası → 0 puan
 *  T < 0 olanlar bu fonksiyona girmemeli (zaten "gecikmiş" sinyali var) */
function aciliyetPuani(kalanGun: number): number {
  if (kalanGun < 0) return 0; // gecikmiş — ayrı sinyal hesaplar
  if (kalanGun <= 1) return 50;
  if (kalanGun <= 3) return 30;
  if (kalanGun <= 7) return 15;
  if (kalanGun <= 14) return 8;
  return 0;
}

function vadeyeKalanGun(tarih?: string, now = new Date()): number | null {
  const d = parseDate(tarih);
  if (!d) return null;
  const ms = d.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function riskSeviyesiFromSkor(skor: number): RiskSeviyesi {
  if (skor >= 75) return "kritik";
  if (skor >= 50) return "yuksek";
  if (skor >= 25) return "orta";
  return "dusuk";
}

export function hesaplaMusteriRisk({
  musteri,
  tebligatlar,
  beyannameler,
  gorevler,
  tahsilatlar,
  tahakkuklar = [],
  kdv2 = [],
}: MusteriRiskHesaplamaInput): HesaplanmisRisk {
  const musteriTebligatlari = tebligatlar.filter((t) => t.musteriId === musteri.id);
  const musteriBeyannameleri = beyannameler.filter((b) => b.musteriId === musteri.id);
  const musteriGorevleri = gorevler.filter((g) => g.musteriId === musteri.id);
  const musteriTahsilatlari = tahsilatlar.filter((t) => t.musteriId === musteri.id);
  const musteriTahakkuklari = tahakkuklar.filter((t) => t.musteriId === musteri.id);
  const musteriKdv2 = kdv2.filter((k) => k.musteriId === musteri.id);

  const sinyaller: HesaplanmisRiskSinyali[] = [];

  // Karşıt inceleme tutanakları kendi (aciliyet tabanlı) sinyalinde ayrıca sayıldığı için
  // burada tekrar sayılmaz — aksi halde çifte puanlama olur ve aciliyet ölçeği bozulur.
  const islenmemisTebligat = musteriTebligatlari.filter(
    (t) => (t.durum === "yeni" || t.durum === "bekliyor") && !karsitIncelemeMi(t)
  );
  const tebligatPuani = sinyalPuani(25, islenmemisTebligat.length, 5, 40);
  if (tebligatPuani > 0) {
    sinyaller.push({
      tip: "islenmemis_tebligat",
      label: "İşlenmemiş tebligat",
      aciklama: `${islenmemisTebligat.length} tebligat işlem bekliyor`,
      puan: tebligatPuani,
      renk: "text-red-600 bg-red-50",
      adet: islenmemisTebligat.length,
    });
  }

  const gecikmisBeyannameler = musteriBeyannameleri.filter((b) => b.durum === "gecikti");
  const beyanPuani = sinyalPuani(30, gecikmisBeyannameler.length, 10, 50);
  if (beyanPuani > 0) {
    sinyaller.push({
      tip: "gecikmis_beyanname",
      label: "Gecikmiş beyanname",
      aciklama: `${gecikmisBeyannameler.length} beyanname gecikmiş durumda`,
      puan: beyanPuani,
      renk: "text-red-600 bg-red-50",
      adet: gecikmisBeyannameler.length,
    });
  }

  const gecikmisTahsilatlar = musteriTahsilatlari.filter(
    (t) => t.durum === "gecikti" || (t.durum !== "odendi" && gecmisTarihMi(t.vadeTarihi))
  );
  const tahsilatPuani = gecikmisTahsilatlar.length > 0
    ? sinyalPuani(20, gecikmisTahsilatlar.length, 5, 35)
    : musteri.tahsilatDurumu === "gecikti"
      ? 15
      : 0;
  if (tahsilatPuani > 0) {
    sinyaller.push({
      tip: "gecikmis_tahsilat",
      label: "Gecikmiş tahsilat",
      aciklama: gecikmisTahsilatlar.length > 0
        ? `${gecikmisTahsilatlar.length} tahsilat vadesini aştı`
        : "Müşteri kartında tahsilat gecikmiş görünüyor",
      puan: tahsilatPuani,
      renk: "text-amber-600 bg-amber-50",
      adet: gecikmisTahsilatlar.length || undefined,
    });
  }

  const gecikmisTahakkuklar = musteriTahakkuklari.filter(
    (t) =>
      t.durum === "gecikti" ||
      (t.durum !== "odendi" && t.durum !== "iptal" && t.durum !== "taslak" && gecmisTarihMi(t.vadeTarihi))
  );
  const tahakkukPuani = sinyalPuani(20, gecikmisTahakkuklar.length, 5, 35);
  if (tahakkukPuani > 0) {
    sinyaller.push({
      tip: "gecikmis_tahakkuk",
      label: "Gecikmiş tahakkuk",
      aciklama: `${gecikmisTahakkuklar.length} tahakkuk vadesini aştı`,
      puan: tahakkukPuani,
      renk: "text-red-600 bg-red-50",
      adet: gecikmisTahakkuklar.length,
    });
  }

  if (musteri.gecikmisPesinat) {
    sinyaller.push({
      tip: "gecikmis_pesinat",
      label: "Gecikmeli peşinat vergisi",
      aciklama: "Peşin vergi ödemesi gecikmiş",
      puan: 20,
      renk: "text-amber-600 bg-amber-50",
    });
  }

  const gecikmisGorevler = musteriGorevleri.filter(
    (g) => !tamamlanmisGorevDurumlari.has(g.durum) && gecmisTarihMi(g.terminTarihi)
  );
  const gorevPuani = sinyalPuani(10, gecikmisGorevler.length, 5, 25);
  if (gorevPuani > 0) {
    sinyaller.push({
      tip: "gecikmis_gorev",
      label: "Gecikmiş görev",
      aciklama: `${gecikmisGorevler.length} görevin termini geçmiş`,
      puan: gorevPuani,
      renk: "text-orange-600 bg-orange-50",
      adet: gecikmisGorevler.length,
    });
  }

  const kritikGorevler = musteriGorevleri.filter(
    (g) => g.oncelik === "kritik" && !tamamlanmisGorevDurumlari.has(g.durum)
  );
  if (kritikGorevler.length > 0) {
    sinyaller.push({
      tip: "kritik_gorev",
      label: "Kritik görev",
      aciklama: `${kritikGorevler.length} kritik görev açık`,
      puan: sinyalPuani(10, kritikGorevler.length, 5, 20),
      renk: "text-orange-600 bg-orange-50",
      adet: kritikGorevler.length,
    });
  }

  const kdv2Kontrol = musteriKdv2.filter((k) => k.aciklama?.toLocaleLowerCase("tr-TR").includes("uyumsuz"));
  if (kdv2Kontrol.length > 0) {
    sinyaller.push({
      tip: "kdv2_kontrol",
      label: "KDV2 kontrol",
      aciklama: `${kdv2Kontrol.length} KDV2 kaydında uyumsuzluk notu var`,
      puan: sinyalPuani(15, kdv2Kontrol.length, 5, 25),
      renk: "text-purple-600 bg-purple-50",
      adet: kdv2Kontrol.length,
    });
  }

  // ── Yaklaşan vadeler (vade yakınlığı ağırlıklı) ──────────────────────────
  // A müşterisinin 1 işi var ama yarın bitecek → yüksek puan
  // B müşterisinin 5 işi var ama 1 ay sonra → düşük puan
  const now = new Date();
  let aciliyetToplam = 0;
  let acilAdet = 0;
  let enYakinGun = Infinity;

  for (const b of musteriBeyannameleri.filter((b) => b.durum === "bekliyor")) {
    const g = vadeyeKalanGun(b.sonTarih, now);
    if (g === null || g < 0) continue;
    const p = aciliyetPuani(g);
    if (p > 0) {
      aciliyetToplam += p;
      acilAdet += 1;
      if (g < enYakinGun) enYakinGun = g;
    }
  }
  for (const gv of musteriGorevleri.filter((g) => !tamamlanmisGorevDurumlari.has(g.durum))) {
    const g = vadeyeKalanGun(gv.terminTarihi, now);
    if (g === null || g < 0) continue;
    const p = aciliyetPuani(g);
    if (p > 0) {
      aciliyetToplam += p;
      acilAdet += 1;
      if (g < enYakinGun) enYakinGun = g;
    }
  }
  for (const t of musteriTahsilatlari.filter((t) => t.durum === "bekliyor")) {
    const g = vadeyeKalanGun(t.vadeTarihi, now);
    if (g === null || g < 0) continue;
    const p = aciliyetPuani(g);
    if (p > 0) {
      aciliyetToplam += p;
      acilAdet += 1;
      if (g < enYakinGun) enYakinGun = g;
    }
  }
  for (const t of musteriTahakkuklari.filter((t) => t.durum === "bekliyor" || t.durum === "kismi")) {
    const g = vadeyeKalanGun(t.vadeTarihi, now);
    if (g === null || g < 0) continue;
    const p = aciliyetPuani(g);
    if (p > 0) {
      aciliyetToplam += p;
      acilAdet += 1;
      if (g < enYakinGun) enYakinGun = g;
    }
  }

  // ── Tebligat / karşıt inceleme SLA aciliyeti ─────────────────────────────
  // Açık (yeni/bekliyor) tebligatların "kritikSonTarih"ine göre aynı aciliyetPuani
  // ölçeği kullanılır — böylece 1 gün kalan beyanname, 3 gün kalan karşıt
  // incelemeden daha riskli sayılır (sabit/flat bir puan değil).
  const acikTebligatlar = musteriTebligatlari.filter((t) => t.durum === "yeni" || t.durum === "bekliyor");
  let karsitAciliyetToplam = 0;
  let karsitEnYakinGun = Infinity;
  let karsitGecikenAdet = 0;
  let digerGecikenTebligatAdet = 0;

  for (const t of acikTebligatlar) {
    const kritikSonTarih = t.kritikSonTarih ?? buildTebligatSlaFields(t).kritikSonTarih;
    const g = vadeyeKalanGun(kritikSonTarih, now);
    if (g === null) continue;
    const karsit = karsitIncelemeMi(t);

    if (g < 0) {
      if (karsit) karsitGecikenAdet += 1;
      else digerGecikenTebligatAdet += 1;
      continue;
    }

    const p = aciliyetPuani(g);
    if (p === 0) continue;

    if (karsit) {
      karsitAciliyetToplam += p;
      if (g < karsitEnYakinGun) karsitEnYakinGun = g;
    } else {
      aciliyetToplam += p;
      acilAdet += 1;
      if (g < enYakinGun) enYakinGun = g;
    }
  }
  // Toplam aciliyet puanı 80 ile sınırlı
  const aciliyetPuaniToplam = Math.min(80, aciliyetToplam);
  if (aciliyetPuaniToplam > 0) {
    const gunStr =
      enYakinGun <= 0 ? "bugün" :
      enYakinGun === 1 ? "yarın" :
      `${enYakinGun} gün içinde`;
    sinyaller.push({
      tip: "yaklasan_vade",
      label: "Yaklaşan vade",
      aciklama: `${acilAdet} iş ${gunStr} bitecek (en yakını: ${gunStr})`,
      puan: aciliyetPuaniToplam,
      renk: enYakinGun <= 1 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50",
      adet: acilAdet,
    });
  }

  // ── Karşıt inceleme tutanağı — aciliyet ölçeğinden gelen puan (sabit değil) ──
  const karsitAciliyetPuani = Math.min(50, karsitAciliyetToplam);
  if (karsitAciliyetPuani > 0) {
    const gunStr =
      karsitEnYakinGun <= 0 ? "bugün" :
      karsitEnYakinGun === 1 ? "yarın" :
      `${karsitEnYakinGun} gün içinde`;
    sinyaller.push({
      tip: "karsit_inceleme",
      label: "Karşıt İnceleme Tutanağı",
      aciklama: `Yanıt süresi ${gunStr} doluyor — kısa SLA nedeniyle yüksek öncelikli`,
      puan: karsitAciliyetPuani,
      renk: "text-red-700 bg-red-100",
    });
  }

  // ── Süresi geçmiş tebligat yanıtları — kaçırılmış yasal süre, en riskli durum ──
  const gecikenTebligatToplam = karsitGecikenAdet + digerGecikenTebligatAdet;
  if (gecikenTebligatToplam > 0) {
    sinyaller.push({
      tip: "gecikmis_tebligat_yaniti",
      label: "Süresi geçmiş tebligat yanıtı",
      aciklama:
        karsitGecikenAdet > 0
          ? `${gecikenTebligatToplam} tebligatın yanıt süresi geçti (${karsitGecikenAdet} karşıt inceleme dahil)`
          : `${gecikenTebligatToplam} tebligatın yanıt süresi geçti`,
      puan: sinyalPuani(karsitGecikenAdet > 0 ? 45 : 30, gecikenTebligatToplam, 10, 60),
      renk: "text-red-700 bg-red-100",
      adet: gecikenTebligatToplam,
    });
  }

  const skor = Math.min(100, sinyaller.reduce((toplam, sinyal) => toplam + sinyal.puan, 0));

  return {
    musteri,
    skor,
    seviye: riskSeviyesiFromSkor(skor),
    sinyaller,
    enYakinVadeGun: enYakinGun === Infinity ? undefined : enYakinGun,
  };
}

export function hesaplaRiskListesi(input: RiskHesaplamaInput): HesaplanmisRisk[] {
  return input.musteriler
    .map((musteri) => hesaplaMusteriRisk({ ...input, musteri }))
    .sort((a, b) => b.skor - a.skor || a.musteri.firmaAdi.localeCompare(b.musteri.firmaAdi, "tr"));
}

export function riskMapOlustur(input: RiskHesaplamaInput) {
  return new Map(hesaplaRiskListesi(input).map((risk) => [risk.musteri.id, risk]));
}
