/**
 * Standart Türkiye vergi takvimi verileri.
 * GİB'in yayınladığı vergi takvimini (gib.gov.tr/vergi-takvimi) baz alır.
 * Resmi takvimde değişiklik olursa burayı güncelle.
 */

export interface VergiTakvimOlay {
  tarih: string; // YYYY-MM-DD
  baslik: string;
  aciklama: string;
  kategori: "aylik" | "gecici_vergi" | "yillik" | "ucaylik" | "bildirim";
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

/** Ayın son gününü hesapla (hafta sonu kaydırmalı) */
function ayinSonGunu(yil: number, ay: number): string {
  const sonGun = new Date(yil, ay + 1, 0).getDate();
  return isBgunu(yil, ay, sonGun);
}

/**
 * Verilen yıl için standart vergi takvimi olaylarını üretir.
 * Hem mevcut hem de bir sonraki yıl için çağırarak takvimi doldur.
 */
export function getVergiTakvimi(yil: number): VergiTakvimOlay[] {
  const olaylar: VergiTakvimOlay[] = [];

  // ── Her ayın 15'i: ÖTV (2A) Kayıt ve Tescile Tabi Olmayanlar ──────────────
  for (let ay = 0; ay < 12; ay++) {
    const tarih = isBgunu(yil, ay, 15);
    const ayAdi = AY_ADI[ay];

    olaylar.push({
      tarih,
      baslik: `ÖTV (1) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait ÖTV (I) sayılı liste — petrol ve doğalgaz ürünleri beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `ÖTV (3A) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait ÖTV (III/A) — kolalı gazoz, alkollü içecek beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `ÖTV (3B) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait ÖTV (III/B) — tütün mamulleri beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `ÖTV (4) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait ÖTV (IV) sayılı liste — lüks tüketim malları beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Banka ve Sigorta Muameleleri Vergisi (BSMV) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait BSMV beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Özel İletişim Vergisi (ÖİV) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Özel İletişim Vergisi beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Kaynak Kullanımı Destekleme Fonu (KKDF) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait KKDF kesintisi beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });
  }

  // ── Her ayın 20'si: Şans Oyunları + Yangın Sigortası ─────────────────────
  for (let ay = 0; ay < 12; ay++) {
    const tarih = isBgunu(yil, ay, 20);
    const ayAdi = AY_ADI[ay];

    olaylar.push({
      tarih,
      baslik: `Şans Oyunları Vergisi — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Şans Oyunları Vergisi beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Yangın Sigortası Vergisi — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Yangın Sigortası Vergisi beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });
  }

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

  // ── Her ayın 26'sı: Aylık beyannameler ──────────────────────────────────
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
      baslik: `Muhtasar Beyanname (MUHSGK) — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Muhtasar ve Prim Hizmet beyanname + ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Damga Vergisi — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Damga Vergisi beyanname ve ödeme son tarihi (beyan usulü mükellefler)`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Konaklama Vergisi — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Konaklama Vergisi beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Turizm Payı — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Turizm Payı beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `Elektrik ve Havagazı Tüketim Vergisi — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait Elektrik ve Havagazı Tüketim Vergisi beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });

    olaylar.push({
      tarih,
      baslik: `İlan ve Reklam Vergisi — ${ayAdi}`,
      aciklama: `${ayAdi} ${yil} dönemine ait İlan ve Reklam Vergisi beyanname ve ödeme son tarihi`,
      kategori: "aylik",
    });
  }

  // ── BA-BS Bildirimi: Her ayın son günü (sonraki ayın 1'i) ──────────────────
  for (let ay = 0; ay < 12; ay++) {
    const tarih = ayinSonGunu(yil, ay);
    const onceki = ay === 0 ? "Aralık" : AY_ADI[ay - 1];
    const onceYil = ay === 0 ? yil - 1 : yil;

    olaylar.push({
      tarih,
      baslik: `Ba-Bs Bildirimi — ${onceki} ${onceYil}`,
      aciklama: `${onceki} ${onceYil} dönemine ait Form Ba (mal/hizmet alımları) ve Form Bs (mal/hizmet satışları) bildirim son tarihi`,
      kategori: "bildirim",
    });
  }

  // ── e-Defter Berat Yükleme: 3 ay sonraki ayın son günü ──────────────────
  for (let ay = 0; ay < 12; ay++) {
    const beratYili = ay >= 9 ? yil + 1 : yil;
    const beratAy = (ay + 3) % 12;
    const tarih = ayinSonGunu(beratYili, beratAy);

    olaylar.push({
      tarih,
      baslik: `e-Defter Berat — ${AY_ADI[ay]} ${yil}`,
      aciklama: `${AY_ADI[ay]} ${yil} dönemine ait e-Defter beratlarının GİB'e yüklenmesi son tarihi`,
      kategori: "bildirim",
    });
  }

  // ── Dijital Hizmet Vergisi (DHV): Ayın son günü ───────────────────────────
  for (let ay = 0; ay < 12; ay++) {
    const tarih = ayinSonGunu(yil, ay);
    const onceki = ay === 0 ? "Aralık" : AY_ADI[ay - 1];
    const onceYil = ay === 0 ? yil - 1 : yil;

    olaylar.push({
      tarih,
      baslik: `Dijital Hizmet Vergisi (DHV) — ${onceki} ${onceYil}`,
      aciklama: `${onceki} ${onceYil} dönemine ait Dijital Hizmet Vergisi beyanname ve ödeme son tarihi`,
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

  // ── GEKAP (Geri Kazanım Katılım Payı) — 6 aylık ────────────────────────────
  olaylar.push({
    tarih: isBgunu(yil, 6, 31), // Temmuz 31
    baslik: `GEKAP — ${yil} 1. Dönem (Oca-Haz)`,
    aciklama: `${yil} Ocak–Haziran dönemine ait Geri Kazanım Katılım Payı beyanname ve ödeme son tarihi`,
    kategori: "ucaylik",
  });
  olaylar.push({
    tarih: isBgunu(yil + 1, 0, 31), // Sonraki Ocak 31
    baslik: `GEKAP — ${yil} 2. Dönem (Tem-Ara)`,
    aciklama: `${yil} Temmuz–Aralık dönemine ait Geri Kazanım Katılım Payı beyanname ve ödeme son tarihi`,
    kategori: "ucaylik",
  });

  // ── Yıllık vergiler ────────────────────────────────────────────────────────
  // Gelir Vergisi: Mart 31
  olaylar.push({
    tarih: isBgunu(yil, 2, 31),
    baslik: `Yıllık Gelir Vergisi Beyanname — ${yil - 1}`,
    aciklama: `${yil - 1} yılı yıllık gelir vergisi beyanname son tarihi ve 1. taksit ödemesi`,
    kategori: "yillik",
  });

  // Gelir Vergisi 2. Taksit: Temmuz 31
  olaylar.push({
    tarih: isBgunu(yil, 6, 31),
    baslik: `Gelir Vergisi 2. Taksit — ${yil - 1}`,
    aciklama: `${yil - 1} yılı gelir vergisi 2. taksit ödeme son tarihi`,
    kategori: "yillik",
  });

  // Basit Usul Yıllık Gelir Vergisi: Şubat son günü
  olaylar.push({
    tarih: ayinSonGunu(yil, 1),
    baslik: `Basit Usul Yıllık Gelir Vergisi — ${yil - 1}`,
    aciklama: `${yil - 1} yılı basit usulde tespit edilen ticari kazançlara ait yıllık gelir vergisi beyanname son tarihi`,
    kategori: "yillik",
  });

  // Kurumlar Vergisi: Nisan 30
  olaylar.push({
    tarih: isBgunu(yil, 3, 30),
    baslik: `Kurumlar Vergisi Beyanname — ${yil - 1}`,
    aciklama: `${yil - 1} yılı kurumlar vergisi beyanname ve ödeme son tarihi`,
    kategori: "yillik",
  });

  // Münferit / Özel Beyanname (Dar Mükellef): Mart 31 + Nisan 30
  olaylar.push({
    tarih: isBgunu(yil, 2, 31),
    baslik: `Dar Mükellef Münferit Beyanname — ${yil - 1}`,
    aciklama: `${yil - 1} dönemine ait dar mükelleflerin münferit beyanname son tarihi`,
    kategori: "yillik",
  });

  // ── Yıllık Damga Vergisi (Yıllık Beyan Usulü) ────────────────────────────
  olaylar.push({
    tarih: isBgunu(yil, 0, 31),
    baslik: `Yıllık Damga Vergisi Beyanname — ${yil - 1}`,
    aciklama: `${yil - 1} yılına ait sürekli mükellefiyet kapsamındaki yıllık damga vergisi beyanname son tarihi`,
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

  // ── Çevre Temizlik Vergisi ─────────────────────────────────────────────────
  olaylar.push({
    tarih: isBgunu(yil, 4, 31),
    baslik: `Çevre Temizlik Vergisi 1. Taksit — ${yil}`,
    aciklama: `${yil} yılı Çevre Temizlik Vergisi 1. taksit ödeme son tarihi (Mayıs)`,
    kategori: "yillik",
  });
  olaylar.push({
    tarih: isBgunu(yil, 10, 30),
    baslik: `Çevre Temizlik Vergisi 2. Taksit — ${yil}`,
    aciklama: `${yil} yılı Çevre Temizlik Vergisi 2. taksit ödeme son tarihi (Kasım)`,
    kategori: "yillik",
  });

  // ── Veraset ve İntikal Vergisi ────────────────────────────────────────────
  olaylar.push({
    tarih: ayinSonGunu(yil, 4), // Mayıs sonu
    baslik: `Veraset ve İntikal Vergisi 1. Taksit — ${yil}`,
    aciklama: `${yil} yılı Veraset ve İntikal Vergisi 1. taksit ödeme son tarihi`,
    kategori: "yillik",
  });
  olaylar.push({
    tarih: ayinSonGunu(yil, 10), // Kasım sonu
    baslik: `Veraset ve İntikal Vergisi 2. Taksit — ${yil}`,
    aciklama: `${yil} yılı Veraset ve İntikal Vergisi 2. taksit ödeme son tarihi`,
    kategori: "yillik",
  });

  // ── Yıllık Harçlar (Trafik / Yargı / Noter) ──────────────────────────────
  olaylar.push({
    tarih: isBgunu(yil, 0, 31),
    baslik: `Yıllık Harçlar — ${yil}`,
    aciklama: `${yil} yılı için yıllık harçların (trafik, noter vb.) ödeme son tarihi`,
    kategori: "yillik",
  });

  return olaylar;
}

/** Takvim bileşenine hazır, deduplikasyonlu vergi olayları (bu yıl + sonraki yıl) */
export function getVergiTakvimiIkiYil(): VergiTakvimOlay[] {
  const yil = new Date().getFullYear();
  return [...getVergiTakvimi(yil), ...getVergiTakvimi(yil + 1)];
}
