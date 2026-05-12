/**
 * Standart Türkiye vergi takvimi verileri.
 * GİB'in yayınladığı vergi takvimini (gib.gov.tr/vergi-takvimi) baz alır.
 * Resmi takvimde değişiklik olursa burayı güncelle.
 */

export interface VergiTakvimOlay {
  tarih: string; // YYYY-MM-DD
  baslik: string;
  aciklama: string;
  kategori: "aylik" | "gecici_vergi" | "yillik";
}

const AY_ADI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** Hafta sonuna denk gelirse bir sonraki Pazartesi'ye kaydır */
function isBgunu(yil: number, ay: number, gun: number): string {
  const d = new Date(yil, ay, gun);
  const gun0 = d.getDay();
  if (gun0 === 6) d.setDate(d.getDate() + 2); // Cumartesi → Pazartesi
  if (gun0 === 0) d.setDate(d.getDate() + 1); // Pazar → Pazartesi
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Verilen yıl için standart vergi takvimi olaylarını üretir.
 * Hem mevcut hem de bir sonraki yıl için çağırarak takvimi doldur.
 */
export function getVergiTakvimi(yil: number): VergiTakvimOlay[] {
  const olaylar: VergiTakvimOlay[] = [];

  // ── Her ayın 23'ü: SGK e-Bildirge ─────────────────────────────────────────
  for (let ay = 0; ay < 12; ay++) {
    const tarih = isBgunu(yil, ay, 23);
    const ayAdi = AY_ADI[ay];

    olaylar.push({
      tarih,
      baslik: `SGK e-Bildirge — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait SGK aylık prim ve hizmet belgesi (e-bildirge) son tarihi`,
      kategori: "aylik",
    });
  }

  // ── Her ayın 26'sı: KDV + KDV-2 + Muhtasar + Damga Vergisi ───────────────
  for (let ay = 0; ay < 12; ay++) {
    const tarih = isBgunu(yil, ay, 26);
    const ayAdi = AY_ADI[ay];

    olaylar.push({
      tarih,
      baslik: `KDV-1 Beyanname — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait KDV-1 beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `KDV-2 Tevkifat — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait KDV-2 (tevkifat) beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Muhtasar Beyanname — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Muhtasar ve Prim Hizmet beyanname + ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Damga Vergisi — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Damga Vergisi beyanname ve ödeme son tarihi (beyan usulü mükellefler)`,
      kategori: "aylik",
    });
  }

  // ── Geçici Vergi (çeyrek bazlı) ────────────────────────────────────────────
  // Q4 önceki yıl → Şubat 17 (bu yılın)
  olaylar.push({
    tarih: isBgunu(yil, 1, 17), // Şubat
    baslik: `Geçici Vergi — ${yil - 1} 4. Çeyrek`,
    aciklama: `${yil - 1} Ekim–Aralık dönemi geçici vergi beyanname ve ödeme son tarihi`,
    kategori: "gecici_vergi",
  });

  // Q1 → Mayıs 17
  olaylar.push({
    tarih: isBgunu(yil, 4, 17), // Mayıs
    baslik: `Geçici Vergi — ${yil} 1. Çeyrek`,
    aciklama: `${yil} Ocak–Mart dönemi geçici vergi beyanname ve ödeme son tarihi`,
    kategori: "gecici_vergi",
  });

  // Q2 → Ağustos 17
  olaylar.push({
    tarih: isBgunu(yil, 7, 17), // Ağustos
    baslik: `Geçici Vergi — ${yil} 2. Çeyrek`,
    aciklama: `${yil} Nisan–Haziran dönemi geçici vergi beyanname ve ödeme son tarihi`,
    kategori: "gecici_vergi",
  });

  // Q3 → Kasım 17
  olaylar.push({
    tarih: isBgunu(yil, 10, 17), // Kasım
    baslik: `Geçici Vergi — ${yil} 3. Çeyrek`,
    aciklama: `${yil} Temmuz–Eylül dönemi geçici vergi beyanname ve ödeme son tarihi`,
    kategori: "gecici_vergi",
  });

  // ── Yıllık vergiler ────────────────────────────────────────────────────────
  // Gelir Vergisi: Mart 31
  const gvTarih = isBgunu(yil, 2, 31);
  olaylar.push({
    tarih: gvTarih,
    baslik: `Gelir Vergisi Beyanname — ${yil}`,
    aciklama: `${yil} yılı gelir vergisi yıllık beyanname son tarihi (1. taksit ödemesi)`,
    kategori: "yillik",
  });

  // Gelir Vergisi 2. Taksit: Temmuz 31
  olaylar.push({
    tarih: isBgunu(yil, 6, 31),
    baslik: `Gelir Vergisi 2. Taksit — ${yil}`,
    aciklama: `${yil} yılı gelir vergisi 2. taksit ödeme son tarihi`,
    kategori: "yillik",
  });

  // Kurumlar Vergisi: Nisan 30
  const kvTarih = isBgunu(yil, 3, 30);
  olaylar.push({
    tarih: kvTarih,
    baslik: `Kurumlar Vergisi — ${yil}`,
    aciklama: `${yil} yılı kurumlar vergisi beyanname ve ödeme son tarihi`,
    kategori: "yillik",
  });

  // ── MTV (Motorlu Taşıtlar Vergisi) ─────────────────────────────────────────
  // 1. taksit: Ocak 31
  olaylar.push({
    tarih: isBgunu(yil, 0, 31),
    baslik: `MTV 1. Taksit — ${yil}`,
    aciklama: `${yil} yılı Motorlu Taşıtlar Vergisi 1. taksit ödeme son tarihi`,
    kategori: "yillik",
  });
  // 2. taksit: Temmuz 31
  olaylar.push({
    tarih: isBgunu(yil, 6, 31),
    baslik: `MTV 2. Taksit — ${yil}`,
    aciklama: `${yil} yılı Motorlu Taşıtlar Vergisi 2. taksit ödeme son tarihi`,
    kategori: "yillik",
  });

  // ── Emlak Vergisi ──────────────────────────────────────────────────────────
  // 1. taksit: Mayıs 31
  olaylar.push({
    tarih: isBgunu(yil, 4, 31),
    baslik: `Emlak Vergisi 1. Taksit — ${yil}`,
    aciklama: `${yil} yılı Emlak Vergisi 1. taksit ödeme son tarihi (Mayıs)`,
    kategori: "yillik",
  });
  // 2. taksit: Kasım 30
  olaylar.push({
    tarih: isBgunu(yil, 10, 30),
    baslik: `Emlak Vergisi 2. Taksit — ${yil}`,
    aciklama: `${yil} yılı Emlak Vergisi 2. taksit ödeme son tarihi (Kasım)`,
    kategori: "yillik",
  });

  return olaylar;
}

/** Takvim bileşenine hazır, deduplikasyonlu vergi olayları (bu yıl + sonraki yıl) */
export function getVergiTakvimiIkiYil(): VergiTakvimOlay[] {
  const yil = new Date().getFullYear();
  return [...getVergiTakvimi(yil), ...getVergiTakvimi(yil + 1)];
}
