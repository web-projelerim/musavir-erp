export interface VergiDairesiGrup {
  grup: string;
  daireler: string[];
}

export const VERGI_DAIRESI_GRUPLARI: VergiDairesiGrup[] = [
  // ─── İSTANBUL ────────────────────────────────────────────────────────────────
  {
    grup: "İstanbul (Avrupa)",
    daireler: [
      "Arnavutköy",
      "Avcılar",
      "Bağcılar",
      "Bahçelievler",
      "Bakırköy",
      "Başakşehir",
      "Bayrampaşa",
      "Beşiktaş",
      "Beylikdüzü",
      "Beyoğlu",
      "Büyükçekmece",
      "Çatalca",
      "Esenler",
      "Esenyurt",
      "Eyüpsultan",
      "Fatih",
      "Gaziosmanpaşa",
      "Güngören",
      "Kâğıthane",
      "Küçükçekmece",
      "Sarıyer",
      "Silivri",
      "Sultangazi",
      "Şişli",
      "Zeytinburnu",
    ],
  },
  {
    grup: "İstanbul (Anadolu)",
    daireler: [
      "Adalar",
      "Ataşehir",
      "Beykoz",
      "Çekmeköy",
      "Kadıköy",
      "Kartal",
      "Maltepe",
      "Pendik",
      "Sancaktepe",
      "Sultanbeyli",
      "Şile",
      "Tuzla",
      "Ümraniye",
      "Üsküdar",
    ],
  },

  // ─── ANKARA ──────────────────────────────────────────────────────────────────
  {
    grup: "Ankara",
    daireler: [
      "Altındağ",
      "Ankara İhtisas",
      "Çankaya",
      "Dikimevi",
      "Etimesgut",
      "Gazi",
      "Keçiören",
      "Kızılbel",
      "Mamak",
      "Mithatpaşa",
      "Öveçler",
      "Polatlı",
      "Pursaklar",
      "Sincan",
      "Ulus",
      "Yenikent",
      "Yenimahalle",
    ],
  },

  // ─── İZMİR ───────────────────────────────────────────────────────────────────
  {
    grup: "İzmir",
    daireler: [
      "Alsancak",
      "Balçova",
      "Bayındır",
      "Bergama",
      "Bornova",
      "Buca",
      "Çiğli",
      "Foça",
      "Gaziemir",
      "İzmir İhtisas",
      "Karşıyaka",
      "Kemalpaşa",
      "Konak",
      "Menemen",
      "Narlıdere",
      "Ödemiş",
      "Selçuk",
      "Tire",
      "Torbalı",
      "Urla",
    ],
  },

  // ─── ADANA ───────────────────────────────────────────────────────────────────
  {
    grup: "Adana",
    daireler: [
      "Adana İhtisas",
      "Ceyhan",
      "Kozan",
      "Seyhan",
      "Yüreğir",
    ],
  },

  // ─── ADIYAMAN ────────────────────────────────────────────────────────────────
  {
    grup: "Adıyaman",
    daireler: ["Adıyaman", "Besni", "Kahta"],
  },

  // ─── AFYONKARAHİSAR ──────────────────────────────────────────────────────────
  {
    grup: "Afyonkarahisar",
    daireler: ["Afyonkarahisar", "Dinar", "Emirdağ", "Sandıklı"],
  },

  // ─── AĞRI ────────────────────────────────────────────────────────────────────
  {
    grup: "Ağrı",
    daireler: ["Ağrı", "Doğubayazıt", "Patnos"],
  },

  // ─── AKSARAY ─────────────────────────────────────────────────────────────────
  {
    grup: "Aksaray",
    daireler: ["Aksaray"],
  },

  // ─── AMASYA ──────────────────────────────────────────────────────────────────
  {
    grup: "Amasya",
    daireler: ["Amasya", "Merzifon", "Suluova"],
  },

  // ─── ANTALYA ─────────────────────────────────────────────────────────────────
  {
    grup: "Antalya",
    daireler: [
      "Aksu",
      "Alanya",
      "Antalya",
      "Elmalı",
      "Kaş",
      "Kepez",
      "Konyaaltı",
      "Kumluca",
      "Manavgat",
      "Serik",
    ],
  },

  // ─── ARDAHAN ─────────────────────────────────────────────────────────────────
  {
    grup: "Ardahan",
    daireler: ["Ardahan"],
  },

  // ─── ARTVİN ──────────────────────────────────────────────────────────────────
  {
    grup: "Artvin",
    daireler: ["Artvin", "Hopa"],
  },

  // ─── AYDIN ───────────────────────────────────────────────────────────────────
  {
    grup: "Aydın",
    daireler: ["Aydın", "Didim", "Efeler", "Kuşadası", "Nazilli", "Söke"],
  },

  // ─── BALIKESİR ───────────────────────────────────────────────────────────────
  {
    grup: "Balıkesir",
    daireler: ["Altıeylül", "Ayvalık", "Bandırma", "Edremit", "Karesi"],
  },

  // ─── BARTIN ──────────────────────────────────────────────────────────────────
  {
    grup: "Bartın",
    daireler: ["Bartın"],
  },

  // ─── BATMAN ──────────────────────────────────────────────────────────────────
  {
    grup: "Batman",
    daireler: ["Batman"],
  },

  // ─── BAYBURT ─────────────────────────────────────────────────────────────────
  {
    grup: "Bayburt",
    daireler: ["Bayburt"],
  },

  // ─── BİLECİK ─────────────────────────────────────────────────────────────────
  {
    grup: "Bilecik",
    daireler: ["Bilecik", "Bozüyük"],
  },

  // ─── BİNGÖL ──────────────────────────────────────────────────────────────────
  {
    grup: "Bingöl",
    daireler: ["Bingöl"],
  },

  // ─── BİTLİS ──────────────────────────────────────────────────────────────────
  {
    grup: "Bitlis",
    daireler: ["Bitlis", "Tatvan"],
  },

  // ─── BOLU ────────────────────────────────────────────────────────────────────
  {
    grup: "Bolu",
    daireler: ["Bolu", "Gerede"],
  },

  // ─── BURDUR ──────────────────────────────────────────────────────────────────
  {
    grup: "Burdur",
    daireler: ["Burdur", "Bucak"],
  },

  // ─── BURSA ───────────────────────────────────────────────────────────────────
  {
    grup: "Bursa",
    daireler: [
      "Bursa İhtisas",
      "Gemlik",
      "İnegöl",
      "İznik",
      "Mudanya",
      "Mustafakemalpaşa",
      "Nilüfer",
      "Osmangazi",
      "Yıldırım",
    ],
  },

  // ─── ÇANAKKALE ───────────────────────────────────────────────────────────────
  {
    grup: "Çanakkale",
    daireler: ["Biga", "Çan", "Çanakkale", "Gelibolu"],
  },

  // ─── ÇANKIRI ─────────────────────────────────────────────────────────────────
  {
    grup: "Çankırı",
    daireler: ["Çankırı"],
  },

  // ─── ÇORUM ───────────────────────────────────────────────────────────────────
  {
    grup: "Çorum",
    daireler: ["Alaca", "Çorum", "Sungurlu"],
  },

  // ─── DENİZLİ ─────────────────────────────────────────────────────────────────
  {
    grup: "Denizli",
    daireler: ["Acıpayam", "Çivril", "Denizli", "Merkezefendi", "Pamukkale"],
  },

  // ─── DİYARBAKIR ──────────────────────────────────────────────────────────────
  {
    grup: "Diyarbakır",
    daireler: ["Bağlar", "Bismil", "Ergani", "Sur", "Yenişehir"],
  },

  // ─── DÜZCE ───────────────────────────────────────────────────────────────────
  {
    grup: "Düzce",
    daireler: ["Akçakoca", "Düzce"],
  },

  // ─── EDİRNE ──────────────────────────────────────────────────────────────────
  {
    grup: "Edirne",
    daireler: ["Edirne", "İpsala", "Keşan", "Uzunköprü"],
  },

  // ─── ELAZIĞ ──────────────────────────────────────────────────────────────────
  {
    grup: "Elazığ",
    daireler: ["Elazığ", "Karakoçan"],
  },

  // ─── ERZİNCAN ────────────────────────────────────────────────────────────────
  {
    grup: "Erzincan",
    daireler: ["Erzincan"],
  },

  // ─── ERZURUM ─────────────────────────────────────────────────────────────────
  {
    grup: "Erzurum",
    daireler: ["Aziziye", "Erzurum", "Horasan", "Pasinler"],
  },

  // ─── ESKİŞEHİR ───────────────────────────────────────────────────────────────
  {
    grup: "Eskişehir",
    daireler: ["Eskişehir", "Odunpazarı", "Tepebaşı"],
  },

  // ─── GAZİANTEP ───────────────────────────────────────────────────────────────
  {
    grup: "Gaziantep",
    daireler: [
      "Gaziantep İhtisas",
      "İslahiye",
      "Nizip",
      "Nurdağı",
      "Şahinbey",
      "Şehitkamil",
    ],
  },

  // ─── GİRESUN ─────────────────────────────────────────────────────────────────
  {
    grup: "Giresun",
    daireler: ["Giresun", "Tirebolu"],
  },

  // ─── GÜMÜŞHANE ───────────────────────────────────────────────────────────────
  {
    grup: "Gümüşhane",
    daireler: ["Gümüşhane"],
  },

  // ─── HAKKARİ ─────────────────────────────────────────────────────────────────
  {
    grup: "Hakkari",
    daireler: ["Hakkari", "Yüksekova"],
  },

  // ─── HATAY ───────────────────────────────────────────────────────────────────
  {
    grup: "Hatay",
    daireler: [
      "Antakya",
      "Dörtyol",
      "İskenderun",
      "Kırıkhan",
      "Reyhanlı",
      "Samandağ",
    ],
  },

  // ─── IĞDIR ───────────────────────────────────────────────────────────────────
  {
    grup: "Iğdır",
    daireler: ["Iğdır"],
  },

  // ─── ISPARTA ─────────────────────────────────────────────────────────────────
  {
    grup: "Isparta",
    daireler: ["Eğirdir", "Isparta"],
  },

  // ─── KAHRAMANMARAŞ ───────────────────────────────────────────────────────────
  {
    grup: "Kahramanmaraş",
    daireler: ["Dulkadiroğlu", "Elbistan", "Onikişubat"],
  },

  // ─── KARABÜK ─────────────────────────────────────────────────────────────────
  {
    grup: "Karabük",
    daireler: ["Karabük"],
  },

  // ─── KARAMAN ─────────────────────────────────────────────────────────────────
  {
    grup: "Karaman",
    daireler: ["Karaman"],
  },

  // ─── KARS ────────────────────────────────────────────────────────────────────
  {
    grup: "Kars",
    daireler: ["Kars", "Sarıkamış"],
  },

  // ─── KASTAMONU ───────────────────────────────────────────────────────────────
  {
    grup: "Kastamonu",
    daireler: ["Kastamonu", "Taşköprü"],
  },

  // ─── KAYSERİ ─────────────────────────────────────────────────────────────────
  {
    grup: "Kayseri",
    daireler: ["Develi", "Kayseri İhtisas", "Kocasinan", "Melikgazi", "Talas"],
  },

  // ─── KİLİS ───────────────────────────────────────────────────────────────────
  {
    grup: "Kilis",
    daireler: ["Kilis"],
  },

  // ─── KIRIKKALE ───────────────────────────────────────────────────────────────
  {
    grup: "Kırıkkale",
    daireler: ["Kırıkkale"],
  },

  // ─── KIRKLARELİ ──────────────────────────────────────────────────────────────
  {
    grup: "Kırklareli",
    daireler: ["Babaeski", "Kırklareli", "Lüleburgaz"],
  },

  // ─── KIRŞEHİR ────────────────────────────────────────────────────────────────
  {
    grup: "Kırşehir",
    daireler: ["Kırşehir"],
  },

  // ─── KOCAELİ ─────────────────────────────────────────────────────────────────
  {
    grup: "Kocaeli",
    daireler: ["Derince", "Gebze", "Gölcük", "İzmit", "Kandıra"],
  },

  // ─── KONYA ───────────────────────────────────────────────────────────────────
  {
    grup: "Konya",
    daireler: [
      "Akşehir",
      "Beyşehir",
      "Ereğli",
      "Karatay",
      "Konya İhtisas",
      "Meram",
      "Selçuklu",
    ],
  },

  // ─── KÜTAHYA ─────────────────────────────────────────────────────────────────
  {
    grup: "Kütahya",
    daireler: ["Kütahya", "Simav", "Tavşanlı"],
  },

  // ─── MALATYA ─────────────────────────────────────────────────────────────────
  {
    grup: "Malatya",
    daireler: ["Battalgazi", "Doğanşehir", "Malatya", "Yeşilyurt"],
  },

  // ─── MANİSA ──────────────────────────────────────────────────────────────────
  {
    grup: "Manisa",
    daireler: [
      "Akhisar",
      "Alaşehir",
      "Manisa",
      "Salihli",
      "Soma",
      "Turgutlu",
    ],
  },

  // ─── MARDİN ──────────────────────────────────────────────────────────────────
  {
    grup: "Mardin",
    daireler: ["Kızıltepe", "Mardin", "Midyat", "Nusaybin"],
  },

  // ─── MERSİN ──────────────────────────────────────────────────────────────────
  {
    grup: "Mersin",
    daireler: ["Akdeniz", "Erdemli", "Mezitli", "Silifke", "Tarsus", "Toroslar"],
  },

  // ─── MUĞLA ───────────────────────────────────────────────────────────────────
  {
    grup: "Muğla",
    daireler: [
      "Bodrum",
      "Dalaman",
      "Datça",
      "Fethiye",
      "Köyceğiz",
      "Marmaris",
      "Milas",
      "Muğla",
      "Ortaca",
    ],
  },

  // ─── MUŞ ─────────────────────────────────────────────────────────────────────
  {
    grup: "Muş",
    daireler: ["Malazgirt", "Muş"],
  },

  // ─── NEVŞEHİR ────────────────────────────────────────────────────────────────
  {
    grup: "Nevşehir",
    daireler: ["Avanos", "Nevşehir", "Ürgüp"],
  },

  // ─── NİĞDE ───────────────────────────────────────────────────────────────────
  {
    grup: "Niğde",
    daireler: ["Bor", "Niğde"],
  },

  // ─── ORDU ────────────────────────────────────────────────────────────────────
  {
    grup: "Ordu",
    daireler: ["Altınordu", "Fatsa", "Perşembe", "Ünye"],
  },

  // ─── OSMANİYE ────────────────────────────────────────────────────────────────
  {
    grup: "Osmaniye",
    daireler: ["Kadirli", "Osmaniye"],
  },

  // ─── RİZE ────────────────────────────────────────────────────────────────────
  {
    grup: "Rize",
    daireler: ["Çayeli", "Pazar", "Rize"],
  },

  // ─── SAKARYA ─────────────────────────────────────────────────────────────────
  {
    grup: "Sakarya",
    daireler: ["Adapazarı", "Akyazı", "Hendek", "Sapanca", "Serdivan"],
  },

  // ─── SAMSUN ──────────────────────────────────────────────────────────────────
  {
    grup: "Samsun",
    daireler: ["Atakum", "Bafra", "Canik", "İlkadım", "Tekkeköy"],
  },

  // ─── SİİRT ───────────────────────────────────────────────────────────────────
  {
    grup: "Siirt",
    daireler: ["Siirt"],
  },

  // ─── SİNOP ───────────────────────────────────────────────────────────────────
  {
    grup: "Sinop",
    daireler: ["Boyabat", "Sinop"],
  },

  // ─── SİVAS ───────────────────────────────────────────────────────────────────
  {
    grup: "Sivas",
    daireler: ["Sivas", "Zara"],
  },

  // ─── ŞANLIURFA ───────────────────────────────────────────────────────────────
  {
    grup: "Şanlıurfa",
    daireler: ["Birecik", "Eyyübiye", "Haliliye", "Karaköprü", "Siverek", "Viranşehir"],
  },

  // ─── ŞIRNAK ──────────────────────────────────────────────────────────────────
  {
    grup: "Şırnak",
    daireler: ["Cizre", "İdil", "Şırnak"],
  },

  // ─── TEKİRDAĞ ────────────────────────────────────────────────────────────────
  {
    grup: "Tekirdağ",
    daireler: ["Çerkezköy", "Çorlu", "Ergene", "Malkara", "Süleymanpaşa"],
  },

  // ─── TOKAT ───────────────────────────────────────────────────────────────────
  {
    grup: "Tokat",
    daireler: ["Niksar", "Tokat", "Turhal", "Zile"],
  },

  // ─── TRABZON ─────────────────────────────────────────────────────────────────
  {
    grup: "Trabzon",
    daireler: ["Akçaabat", "Of", "Ortahisar", "Trabzon"],
  },

  // ─── TUNCELİ ─────────────────────────────────────────────────────────────────
  {
    grup: "Tunceli",
    daireler: ["Tunceli"],
  },

  // ─── UŞAK ────────────────────────────────────────────────────────────────────
  {
    grup: "Uşak",
    daireler: ["Banaz", "Uşak"],
  },

  // ─── VAN ─────────────────────────────────────────────────────────────────────
  {
    grup: "Van",
    daireler: ["Edremit", "Erciş", "İpekyolu", "Tuşba"],
  },

  // ─── YALOVA ──────────────────────────────────────────────────────────────────
  {
    grup: "Yalova",
    daireler: ["Altınova", "Çınarcık", "Yalova"],
  },

  // ─── YOZGAT ──────────────────────────────────────────────────────────────────
  {
    grup: "Yozgat",
    daireler: ["Akdağmadeni", "Boğazlıyan", "Sorgun", "Yozgat"],
  },

  // ─── ZONGULDAK ───────────────────────────────────────────────────────────────
  {
    grup: "Zonguldak",
    daireler: ["Alaplı", "Çaycuma", "Devrek", "Kdz. Ereğli", "Kozlu", "Zonguldak"],
  },
];

/** Flat liste — arama veya validation için */
export const TUM_VERGI_DAIRELERI: string[] = VERGI_DAIRESI_GRUPLARI.flatMap(
  (g) => g.daireler
);
