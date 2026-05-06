export interface VergiDairesiGrup {
  grup: string;
  daireler: string[];
}

export const VERGI_DAIRESI_GRUPLARI: VergiDairesiGrup[] = [
  {
    grup: "İstanbul (Avrupa)",
    daireler: [
      "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa",
      "Beşiktaş", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Esenler",
      "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören",
      "Kâğıthane", "Küçükçekmece", "Sarıyer", "Silivri", "Sultangazi",
      "Şişli", "Zeytinburnu",
    ],
  },
  {
    grup: "İstanbul (Anadolu)",
    daireler: [
      "Ataşehir", "Beykoz", "Çekmeköy", "Kadıköy", "Kartal", "Maltepe",
      "Pendik", "Sancaktepe", "Sultanbeyli", "Şile", "Tuzla", "Ümraniye",
      "Üsküdar",
    ],
  },
  {
    grup: "Ankara",
    daireler: [
      "Altındağ", "Çankaya", "Etimesgut", "Keçiören", "Mamak", "Sincan",
      "Yenimahalle",
    ],
  },
  {
    grup: "İzmir",
    daireler: ["Alsancak", "Bornova", "Buca", "Çiğli", "Karşıyaka", "Konak"],
  },
  {
    grup: "Diğer İller",
    daireler: [
      "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
      "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın",
      "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
      "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır",
      "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
      "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır",
      "Isparta", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu",
      "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli",
      "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla",
      "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya",
      "Samsun", "Şanlıurfa", "Şırnak", "Siirt", "Sinop", "Sivas", "Tekirdağ",
      "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat",
      "Zonguldak",
    ],
  },
];
