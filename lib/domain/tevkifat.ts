/**
 * KDV Tevkifat Oranları Katalogu (KDV2)
 *
 * Kaynak: KDV Genel Uygulama Tebliği (II/C bölümü) kapsamındaki kısmi tevkifat
 * uygulamaları. Oranlar hesaplanan KDV tutarı üzerinden alıcının sorumlu
 * sıfatıyla beyan edeceği (KDV2) kısmı gösterir.
 *
 * NOT: Tevkifat oranları ve alt/üst sınırlar mevzuat değişiklikleriyle
 * güncellenebilir. Bu katalog, uygulamada seçim ve otomatik hesap içindir;
 * güncel mevzuatla teyit edilmesi kullanıcının sorumluluğundadır.
 */

export interface TevkifatTuru {
  key: string;
  /** UI etiketi — işlem/hizmet türü */
  label: string;
  /** Tevkifat oranı payı (ör. 9/10 için 9) */
  pay: number;
  /** Tevkifat oranı paydası (ör. 9/10 için 10) */
  payda: number;
  /** Kısa açıklama / kapsam notu */
  aciklama?: string;
  /** Bu işlem için tipik/uygulanan KDV oranları (%) — UI'da öntanımlı seçim */
  tipikKdvOranlari?: number[];
}

/**
 * Tam liste — 2/10'dan 10/10'a resmi kısmi (ve tam) tevkifat türleri.
 * Oran sırasına göre gruplanır.
 */
export const TEVKIFAT_TURLERI: TevkifatTuru[] = [
  // ── 2/10 ──
  {
    key: "yapim_isleri",
    label: "Yapım işleri ve bu işlerle birlikte ifa edilen mühendislik-mimarlık",
    pay: 4,
    payda: 10,
    aciklama: "Yapım işleri (4/10). Kamuya karşı yapılan işlerde uygulanır.",
    tipikKdvOranlari: [20],
  },
  {
    key: "etut_proje",
    label: "Etüt, plan-proje, danışmanlık, denetim ve benzeri hizmetler",
    pay: 9,
    payda: 10,
    aciklama: "Mühendislik, mimarlık, etüt-proje, danışmanlık, denetim (9/10).",
    tipikKdvOranlari: [20],
  },
  // ── makine, tesis, iş gücü ──
  {
    key: "makine_tesisat_tamir",
    label: "Makine, teçhizat, demirbaş ve taşıtların bakım-onarımı",
    pay: 7,
    payda: 10,
    aciklama: "Bakım, onarım, tadil hizmetleri (7/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "isgucu_temini",
    label: "İş gücü temin hizmetleri (özel güvenlik dâhil)",
    pay: 9,
    payda: 10,
    aciklama: "İş gücü temini ve özel güvenlik hizmetleri (9/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "yapi_denetim",
    label: "Yapı denetim hizmetleri",
    pay: 9,
    payda: 10,
    aciklama: "Yapı denetim kuruluşlarınca verilen hizmetler (9/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "fason_tekstil",
    label: "Fason tekstil ve konfeksiyon, çanta-ayakkabı dikim işleri",
    pay: 7,
    payda: 10,
    aciklama: "Fason olarak yaptırılan tekstil/konfeksiyon işleri (7/10).",
    tipikKdvOranlari: [10, 20],
  },
  {
    key: "temizlik",
    label: "Temizlik, çevre ve bahçe bakım hizmetleri",
    pay: 9,
    payda: 10,
    aciklama: "Temizlik, çevre bakım, bahçe bakım (9/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "yemek_servis",
    label: "Yemek servis ve organizasyon hizmetleri",
    pay: 5,
    payda: 10,
    aciklama: "Yemek servisi ve organizasyon hizmetleri (5/10).",
    tipikKdvOranlari: [10, 20],
  },
  {
    key: "servis_tasima",
    label: "Servis taşımacılığı hizmetleri",
    pay: 5,
    payda: 10,
    aciklama: "Personel/öğrenci servis taşımacılığı (5/10).",
    tipikKdvOranlari: [10, 20],
  },
  {
    key: "spor_kulubu",
    label: "Spor kulüplerinin yayın, reklam ve isim hakkı gelirleri",
    pay: 9,
    payda: 10,
    aciklama: "Spor kulüplerine ait işlemler (9/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "baski_basim",
    label: "Baskı ve basım hizmetleri",
    pay: 7,
    payda: 10,
    aciklama: "Baskı, basım ve matbaa hizmetleri (7/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "diger_hizmetler",
    label: "Diğer hizmetler (belirlenmiş alıcılara)",
    pay: 5,
    payda: 10,
    aciklama: "KDV mükellefi belirlenmiş alıcılara ifa edilen diğer hizmetler (5/10).",
    tipikKdvOranlari: [20],
  },
  // ── Teslimler ──
  {
    key: "hurda_metal",
    label: "Hurda ve atık teslimleri (metal, plastik, kağıt, cam vb.)",
    pay: 7,
    payda: 10,
    aciklama: "Hurda/atık teslimleri (7/10). İstisnadan vazgeçilmişse tevkifat.",
    tipikKdvOranlari: [20],
  },
  {
    key: "metal_hammadde",
    label: "Metal, plastik, lastik, kauçuk, kâğıt, cam hurdalarından elde edilen hammadde",
    pay: 9,
    payda: 10,
    aciklama: "Hurdadan elde edilen hammadde teslimleri (9/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "bakir_aluminyum",
    label: "Bakır, çinko, alüminyum ve kurşun ürünlerinin teslimi",
    pay: 5,
    payda: 10,
    aciklama: "Bakır/çinko/alüminyum/kurşun külçe ve ürün teslimleri (5/10).",
    tipikKdvOranlari: [20],
  },
  {
    key: "pamuk_yun",
    label: "Pamuk, tiftik, yün, yapağı ve ham post-deri teslimleri",
    pay: 9,
    payda: 10,
    aciklama: "Pamuk, tiftik, yün, ham deri (9/10).",
    tipikKdvOranlari: [10],
  },
  {
    key: "agac_orman",
    label: "Ağaç ve orman ürünleri teslimi",
    pay: 5,
    payda: 10,
    aciklama: "Ağaç ve orman ürünleri (5/10).",
    tipikKdvOranlari: [10, 20],
  },
  {
    key: "demir_celik",
    label: "Demir-çelik ürünlerinin teslimi",
    pay: 5,
    payda: 10,
    aciklama: "Demir-çelik ürünleri (5/10).",
    tipikKdvOranlari: [20],
  },
  // ── Tam tevkifat (10/10) ──
  {
    key: "tam_tevkifat",
    label: "Tam tevkifat kapsamı işlemler (10/10)",
    pay: 10,
    payda: 10,
    aciklama: "İkametgâhı yurt dışında olanlardan hizmet alımı vb. tam tevkifat.",
    tipikKdvOranlari: [20],
  },
];

/** Katalogda hızlı arama için key → tür haritası. */
export const TEVKIFAT_MAP: Record<string, TevkifatTuru> = Object.fromEntries(
  TEVKIFAT_TURLERI.map((t) => [t.key, t])
);

/** Bir tevkifat türü için oranı ondalık döndürür (ör. 9/10 → 0.9). */
export function tevkifatOrani(key: string): number {
  const t = TEVKIFAT_MAP[key];
  return t ? t.pay / t.payda : 0;
}

/** İnsan-okur oran etiketi (ör. "9/10"). */
export function tevkifatOranEtiketi(key: string): string {
  const t = TEVKIFAT_MAP[key];
  return t ? `${t.pay}/${t.payda}` : "-";
}

export interface Kdv2HesapSonuc {
  kdvTutari: number;
  /** Alıcının sorumlu sıfatıyla beyan edeceği tevkifatlı kısım (KDV2) */
  tevkifEdilenKdv: number;
  /** Satıcıya ödenecek KDV (tevkifat sonrası kalan) */
  saticiyaOdenenKdv: number;
  /** Fatura genel toplamı (matrah + satıcıya kalan KDV) */
  faturaToplam: number;
}

/**
 * KDV2 (tevkifat) hesabı.
 * @param matrah   KDV matrahı
 * @param kdvOrani KDV oranı (%) — ör. 20
 * @param tevkifatKey  Tevkifat türü key'i
 */
export function hesaplaKdv2(
  matrah: number,
  kdvOrani: number,
  tevkifatKey: string
): Kdv2HesapSonuc {
  const m = Math.max(0, matrah);
  const kdvTutari = m * (kdvOrani / 100);
  const oran = tevkifatOrani(tevkifatKey);
  const tevkifEdilenKdv = kdvTutari * oran;
  const saticiyaOdenenKdv = kdvTutari - tevkifEdilenKdv;
  return {
    kdvTutari,
    tevkifEdilenKdv,
    saticiyaOdenenKdv,
    faturaToplam: m + saticiyaOdenenKdv,
  };
}
