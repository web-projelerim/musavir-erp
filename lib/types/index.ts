// ─── Kullanıcı ve Rol ────────────────────────────────────────────
export type UserRole = "musavir" | "personel" | "mukellef";

export interface User {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  rol: UserRole;
  avatar?: string;
  aktif: boolean;
  createdAt: string;
}

// ─── Müşteri ────────────────────────────────────────────────────
export type RiskSeviyesi = "dusuk" | "orta" | "yuksek" | "kritik";
export type MusteriDurum = "aktif" | "pasif" | "beklemede";

export interface Musteri {
  id: string;
  firmaAdi: string;
  vknTckn: string;
  yetkiliAd: string;
  telefon: string;
  email: string;
  adres: string;
  durum: MusteriDurum;
  riskSeviyesi: RiskSeviyesi;
  riskSkoru: number;
  sorumluPersonel: string;
  yaklasanBeyanname?: string;
  sonTebligat?: string;
  gorevDurumu: string;
  tahsilatDurumu: TahsilatDurum;
  sonGuncelleme: string;
  kdvMukellef: boolean;
  muhtasarMukellef: boolean;
  gecikmisPesinat: boolean;
}

export type TahsilatDurum = "odendi" | "bekliyor" | "gecikti" | "kismi";

// ─── Görev ────────────────────────────────────────────────────
export type GorevDurum = "beklemede" | "devam" | "tamamlandi" | "iptal";
export type GorevOncelik = "dusuk" | "normal" | "yuksek" | "kritik";
export type GorevTip =
  | "beyanname"
  | "tebligat"
  | "tahsilat"
  | "belge"
  | "kdv2"
  | "diger";

export interface Gorev {
  id: string;
  baslik: string;
  aciklama?: string;
  musteriId: string;
  musteriAdi: string;
  atananKisi: string;
  atayanKisi: string;
  terminTarihi: string;
  oncelik: GorevOncelik;
  durum: GorevDurum;
  tip: GorevTip;
  tamamlanmaTarihi?: string;
  notlar?: string;
  createdAt: string;
}

// ─── Tebligat ─────────────────────────────────────────────────
export type TebligatDurum = "yeni" | "okundu" | "islendi" | "bekliyor";

export interface Tebligat {
  id: string;
  musteriId: string;
  musteriAdi: string;
  vknTckn: string;
  tarih: string;
  baslik: string;
  tur: string;
  durum: TebligatDurum;
  pdfUrl?: string;
  notlar?: string;
}

// ─── Beyanname ────────────────────────────────────────────────
export type BeyannameDurum = "verildi" | "bekliyor" | "gecikti" | "iptal";
export type BeyannameType =
  | "KDV"
  | "MUHTAS"
  | "KURUM"
  | "GELIR"
  | "GECICI"
  | "DIGER";

export interface Beyanname {
  id: string;
  musteriId: string;
  musteriAdi: string;
  tur: BeyannameType;
  donem: string;
  sonTarih: string;
  durum: BeyannameDurum;
  verilmeTarihi?: string;
  sorumlu: string;
  vergiTutari?: number;
}

// ─── Rapor ───────────────────────────────────────────────────
export type RaporDurum =
  | "uretiliyor"
  | "hazir"
  | "gonderildi"
  | "basarisiz";
export type RaporTip = "gelir_gider" | "vergi_beyan" | "operasyon" | "risk";

export interface Rapor {
  id: string;
  musteriId: string;
  musteriAdi: string;
  tip: RaporTip;
  donem: string;
  durum: RaporDurum;
  olusturmaTarihi: string;
  gonderimTarihi?: string;
  kanal?: "whatsapp" | "email" | "panel";
  pdfUrl?: string;
}

// ─── Risk Sinyali ────────────────────────────────────────────
export type RiskSinyalTip =
  | "gecikli_beyan"
  | "islenmemis_tebligat"
  | "eksik_belge"
  | "odenmemis_ucret"
  | "gorev_gecikmesi"
  | "kdv2_uyumsuzluk"
  | "senkronizasyon_hatasi";

export interface RiskSinyali {
  id: string;
  musteriId: string;
  tip: RiskSinyalTip;
  aciklama: string;
  puan: number;
  tarih: string;
  aktif: boolean;
}

// ─── KDV2 Hesaplama ──────────────────────────────────────────
export interface KDV2Hesaplama {
  id: string;
  musteriId?: string;
  musteriAdi?: string;
  belgeTarihi: string;
  belgeNo: string;
  kdvMatrahi: number;
  kdvOrani: number;
  kdvTutari: number;
  kdv2Tutari: number;
  aciklama?: string;
  createdAt: string;
}

// ─── Tahsilat ────────────────────────────────────────────────
export interface Tahsilat {
  id: string;
  musteriId: string;
  musteriAdi: string;
  tutar: number;
  donem: string;
  vadeTarihi: string;
  odemeTarihi?: string;
  durum: TahsilatDurum;
  notlar?: string;
}

// ─── Bildirim ────────────────────────────────────────────────
export type BildirimTip =
  | "beyanname"
  | "tebligat"
  | "gorev"
  | "rapor"
  | "tahsilat"
  | "sistem";
export type BildirimDurum = "okunmamis" | "okundu";

export interface Bildirim {
  id: string;
  tip: BildirimTip;
  baslik: string;
  mesaj: string;
  durum: BildirimDurum;
  tarih: string;
  link?: string;
}

// ─── Filtre ve Sayfalama ─────────────────────────────────────
export interface PaginationMeta {
  sayfa: number;
  sayfaBasi: number;
  toplam: number;
  toplamSayfa: number;
}

export interface FilterState {
  arama?: string;
  durum?: string;
  risk?: string;
  sorumlu?: string;
  tarihBaslangic?: string;
  tarihBitis?: string;
}
