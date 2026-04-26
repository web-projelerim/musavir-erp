// ─── Kullanıcı ve Rol ────────────────────────────────────────────
export type UserRole = "musavir" | "personel" | "mukellef";

export interface User {
  id: string;
  ofisId?: string;
  ad: string;
  soyad: string;
  email: string;
  rol: UserRole;
  yetkiler?: KullaniciYetki[];
  avatar?: string;
  musteriId?: string;
  davetId?: string;
  aktif: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type KullaniciYetki =
  | "portfoy_okuma"
  | "musteri_yazma"
  | "tahakkuk_yazma"
  | "belge_yonetimi"
  | "gib_okuma"
  | "rapor_yonetimi";

export interface Ofis {
  id: string;
  unvan: string;
  vergiDairesi?: string;
  telefon?: string;
  email?: string;
  whatsappDurum: "pasif" | "hazirlik" | "aktif";
  gibDurum: "pasif" | "hazirlik" | "aktif";
  createdAt: string;
}

export type EntegrasyonDurum = "bagli" | "eksik" | "hata" | "test_edilmedi";
export type SecretStorageMode = "server_secret_manager" | "encrypted_server_store" | "not_configured";
export type GibEntegrasyonModu = "manuel" | "ivd" | "ebeyanname" | "resmi_api";
export type LucaEntegrasyonModu = "import_export" | "yardimli_senkron" | "dogrudan_baglanti";

export interface GibEntegrasyonAyari {
  id: string;
  ofisId: string;
  durum: EntegrasyonDurum;
  entegrasyonModu: GibEntegrasyonModu;
  vknTckn?: string;
  ivdKullaniciKodu?: string;
  ivdSifreSet: boolean;
  ebeyannameKullaniciKodu?: string;
  ebeyannameParolaSet: boolean;
  ebeyannameSifreSet: boolean;
  eTebligatAktif: boolean;
  beyanGonderimYetkisi: boolean;
  borcSorguYetkisi: boolean;
  tebligatGoruntulemeYetkisi: boolean;
  pdfIndirmeYetkisi: boolean;
  manuelSenkronAktif: boolean;
  otomatikTebligatSync: boolean;
  otomatikBeyanSync: boolean;
  otomatikBorcSync: boolean;
  syncSaati?: string;
  secretStorageMode: SecretStorageMode;
  sonTestTarihi?: string;
  sonBasariliSync?: string;
  sonHata?: string;
  credentialUyarisi?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface LucaEntegrasyonAyari {
  id: string;
  ofisId: string;
  durum: EntegrasyonDurum;
  entegrasyonModu: LucaEntegrasyonModu;
  uyeNo?: string;
  adminKullaniciAdi?: string;
  adminSifreSet: boolean;
  firmaKodEslemeKurali?: string;
  musteriImportAktif: boolean;
  beyanImportAktif: boolean;
  tahakkukImportAktif: boolean;
  disaAktarimAktif: boolean;
  secretStorageMode: SecretStorageMode;
  sonTestTarihi?: string;
  sonImportTarihi?: string;
  sonHata?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface WhatsAppEntegrasyonAyari {
  id: string;
  ofisId: string;
  durum: EntegrasyonDurum;
  provider: "meta_cloud_api" | "diger";
  businessPhoneNumberId?: string;
  accessTokenSet: boolean;
  verifyTokenSet: boolean;
  tahakkukMesajiAktif: boolean;
  vadeHatirlatmaAktif: boolean;
  belgeEksikAktif: boolean;
  davetMesajiAktif: boolean;
  secretStorageMode: SecretStorageMode;
  sonTestTarihi?: string;
  sonHata?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface BankaEntegrasyonAyari {
  id: string;
  ofisId: string;
  durum: EntegrasyonDurum;
  importModu: "xlsx_csv" | "servis";
  varsayilanIbanlar: string[];
  musteriAliaslari: string[];
  vergiAnahtarKelimeleri: string[];
  hizmetAnahtarKelimeleri: string[];
  manuelOnayZorunlu: boolean;
  sonImportTarihi?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface EmailEntegrasyonAyari {
  id: string;
  ofisId: string;
  durum: EntegrasyonDurum;
  gondericiAdi?: string;
  gondericiEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpKullanici?: string;
  smtpSifreSet: boolean;
  secretStorageMode: SecretStorageMode;
  sonTestTarihi?: string;
  sonHata?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface EntegrasyonLog {
  id: string;
  ofisId: string;
  entegrasyon: "gib" | "luca" | "whatsapp" | "banka" | "email";
  islem: "test" | "manuel_sync" | "kaydet" | "import" | "export";
  durum: "bekliyor" | "basarili" | "basarisiz";
  detay?: string;
  createdBy: string;
  createdAt: string;
}

export type DavetDurum = "bekliyor" | "kullanildi" | "suresi_doldu" | "iptal";

export interface Davet {
  id: string;
  ofisId: string;
  rol: UserRole;
  email: string;
  musteriId?: string;
  musteriAdi?: string;
  tokenHash: string;
  davetLinki: string;
  durum: DavetDurum;
  expiresAt: string;
  usedAt?: string;
  createdBy: string;
  createdAt: string;
}

// ─── Müşteri ────────────────────────────────────────────────────
export type RiskSeviyesi = "dusuk" | "orta" | "yuksek" | "kritik";
export type MusteriDurum = "aktif" | "pasif" | "beklemede";

export interface Musteri {
  id: string;
  ofisId?: string;
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
  kaynak?: "manuel" | "excel" | "gib" | "demo";
  importBatchId?: string;
  portalUserId?: string;
  etiketler?: string[];
  aktifHizmetler?: string[];
  varsayilanHizmetUcreti?: number;
}

export type TahsilatDurum = "odendi" | "bekliyor" | "gecikti" | "kismi";

export type SirketTuru = "limited" | "anonim" | "sahis" | "diger";
export type BeyanPeriyot = "aylik" | "uc_aylik" | "yillik" | "yok";

export interface MukellefiyetProfili {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  sirketTuru: SirketTuru;
  kdvPeriyot: BeyanPeriyot;
  muhtasarPeriyot: BeyanPeriyot;
  geciciVergiTakibi: boolean;
  sgkTakibi: boolean;
  eTebligatAktif: boolean;
  durum: MusteriDurum;
  kaynak: "sistem" | "manuel";
  notlar?: string;
  createdAt: string;
  updatedAt?: string;
}

export type YukumlulukTipi = "kdv" | "muhtasar" | "gecici_vergi" | "sgk";
export type YukumlulukDurumu =
  | "planlandi"
  | "bekliyor"
  | "hazirlaniyor"
  | "tamamlandi"
  | "gecikti"
  | "pasif";

export interface Yukumluluk {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  profilId?: string;
  tip: YukumlulukTipi;
  donem: string;
  sonTarih: string;
  durum: YukumlulukDurumu;
  sorumlu: string;
  kaynak: "sistem" | "manuel";
  bagliBeyannameId?: string;
  aciklama?: string;
  createdAt: string;
}

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

export interface GorevNot {
  id: string;
  metin: string;
  tarih: string;
  yazar?: string;
}

export interface Gorev {
  id: string;
  ofisId?: string;
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
  notlar?: GorevNot[] | string;
  createdAt: string;
}

// ─── Tebligat ─────────────────────────────────────────────────
export type TebligatDurum = "yeni" | "okundu" | "islendi" | "bekliyor";
export type TebligatOnemDerecesi = "normal" | "yuksek" | "kritik";
export type TebligatAksiyonTipi =
  | "incele"
  | "yanit_hazirla"
  | "odeme_kontrol"
  | "uzlasma_degerlendir"
  | "bilgi_tamamla";
export type TebligatAksiyonDurum = "bekliyor" | "islemde" | "tamamlandi";

export interface Tebligat {
  id: string;
  ofisId?: string;
  musteriId: string;
  musteriAdi: string;
  vknTckn: string;
  tarih: string;
  baslik: string;
  tur: string;
  durum: TebligatDurum;
  ulasmaTarihi?: string;
  tebligEdilmisSayilmaTarihi?: string;
  kritikSonTarih?: string;
  onemDerecesi?: TebligatOnemDerecesi;
  aksiyonTipi?: TebligatAksiyonTipi;
  aksiyonDurumu?: TebligatAksiyonDurum;
  aksiyonSahibi?: string;
  pdfUrl?: string;
  notlar?: string;
}

// ─── Beyanname ────────────────────────────────────────────────
export type BeyannameDurum = "verildi" | "bekliyor" | "gecikti" | "iptal";
export type BeyannameYasamDongusuDurum =
  | "planlandi"
  | "evrak_bekliyor"
  | "hazirlaniyor"
  | "ic_kontrol"
  | "musavir_onayi"
  | "gonderildi"
  | "tahakkuk_olustu"
  | "odeme_bekliyor"
  | "kapandi"
  | "duzeltme_gerekli"
  | "iptal";
export type BeyannameType =
  | "KDV"
  | "MUHTAS"
  | "KURUM"
  | "GELIR"
  | "GECICI"
  | "DIGER";

export interface Beyanname {
  id: string;
  ofisId?: string;
  musteriId: string;
  musteriAdi: string;
  tur: BeyannameType;
  donem: string;
  sonTarih: string;
  durum: BeyannameDurum;
  yasamDongusuDurum: BeyannameYasamDongusuDurum;
  verilmeTarihi?: string;
  sorumlu: string;
  vergiTutari?: number;
  tahakkukFisNo?: string;
  tahakkukFisTarihi?: string;
  odemeSonTarihi?: string;
  kaynakSistem?: "manual" | "gib" | "luca";
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
  ofisId?: string;
  musteriId: string;
  musteriAdi: string;
  tip: RaporTip;
  donem: string;
  durum: RaporDurum;
  olusturmaTarihi: string;
  gonderimTarihi?: string;
  kanal?: "whatsapp" | "email" | "panel";
  pdfUrl?: string;
  pdfStoragePath?: string;
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
  ofisId?: string;
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

export type BelgeKategori =
  | "beyanname"
  | "tebligat"
  | "rapor"
  | "sozlesme"
  | "fatura"
  | "diger";
export type BelgeGorunurluk = "musavir" | "mukellef";

export interface Belge {
  id: string;
  ofisId?: string;
  musteriId: string;
  musteriAdi: string;
  dosyaAdi: string;
  dosyaTipi: string;
  boyut: number;
  url: string;
  storagePath?: string;
  kategori: BelgeKategori;
  gorunurluk: BelgeGorunurluk;
  yukleyen: string;
  yukleyenRol: UserRole;
  notlar?: string;
  createdAt: string;
}

// ─── Tahsilat ────────────────────────────────────────────────
export interface Tahsilat {
  id: string;
  ofisId?: string;
  tahakkukId?: string;
  musteriId: string;
  musteriAdi: string;
  tutar: number;
  odenenTutar?: number;
  donem: string;
  vadeTarihi: string;
  odemeTarihi?: string;
  durum: TahsilatDurum;
  notlar?: string;
}

export type TahakkukDurum = "taslak" | "bekliyor" | "kismi" | "odendi" | "gecikti" | "iptal";
export type TahakkukBildirimDurum = "beklemede" | "planlandi" | "gonderildi" | "basarisiz" | "kapali";
export type TahakkukTuru = "hizmet" | "vergi";
export type HizmetTuru = "mali_musavirlik" | "beyanname" | "danismanlik" | "diger";
export type VergiTahakkukTuru = "KDV" | "MUHTASAR" | "GECICI_VERGI" | "KURUMLAR" | "GELIR" | "DAMGA" | "SGK" | "DIGER";
export type TahakkukKaynakSistem = "manual" | "gib" | "luca";

export interface Tahakkuk {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  donem: string;
  tahakkukTuru: TahakkukTuru;
  hizmetTuru?: HizmetTuru;
  vergiTuru?: VergiTahakkukTuru;
  kaynakBeyannameId?: string;
  resmiTahakkukFisNo?: string;
  kaynakSistem?: TahakkukKaynakSistem;
  otomatikTuretilmis?: boolean;
  tutar: number;
  odenenTutar?: number;
  vadeTarihi: string;
  durum: TahakkukDurum;
  bildirimDurumu: TahakkukBildirimDurum;
  panelLinki: string;
  aciklama?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type OdemeDurum = "eslesti" | "onay_bekliyor" | "eslesmedi" | "iptal";
export type OdemeKaynak = "banka" | "manuel";
export type BankaOdemeSinifi = TahakkukTuru | "belirsiz";

export interface Odeme {
  id: string;
  ofisId: string;
  musteriId?: string;
  musteriAdi?: string;
  tahakkukId?: string;
  tahakkukTuru?: TahakkukTuru;
  tutar: number;
  odemeTarihi: string;
  bankaAciklamasi?: string;
  iban?: string;
  dekontNo?: string;
  eslesmeSkoru?: number;
  durum: OdemeDurum;
  kaynak: OdemeKaynak;
  ekstreId?: string;
  createdAt: string;
}

export interface BankaEkstreSatiri {
  id: string;
  tarih: string;
  aciklama: string;
  tutar: number;
  gonderen?: string;
  iban?: string;
  dekontNo?: string;
  musteriId?: string;
  musteriAdi?: string;
  tahakkukId?: string;
  tahakkukTuru?: TahakkukTuru;
  odemeSinifi?: BankaOdemeSinifi;
  eslesenTahakkukEtiketi?: string;
  eslesmeSkoru?: number;
  durum: OdemeDurum;
  uyarilar?: string[];
}

export interface BankaEkstresi {
  id: string;
  ofisId: string;
  dosyaAdi: string;
  donem: string;
  satirSayisi: number;
  eslesenSayisi: number;
  onayBekleyenSayisi: number;
  eslesmeyenSayisi: number;
  duplicateSayisi: number;
  satirlar: BankaEkstreSatiri[];
  createdBy: string;
  createdAt: string;
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

// ─── Gönderim Kaydı ─────────────────────────────────────────
export type GonderimKanal = "whatsapp" | "email" | "panel";
export type GonderimDurum = "bekliyor" | "gonderildi" | "basarisiz";

export interface GonderimKaydi {
  id: string;
  ofisId?: string;
  kanal: GonderimKanal;
  musteriId: string;
  musteriAdi: string;
  sablonId?: string;
  icerikRef?: string;
  mesaj?: string;
  durum: GonderimDurum;
  hataMesaji?: string;
  denemeSayisi: number;
  createdAt: string;
  sentAt?: string;
}

export interface ResmiGazeteOzeti {
  id: string;
  ofisId: string;
  yayinTarihi: string;
  baslik: string;
  kaynakLink: string;
  kategori: string;
  aiOzet?: string;
  maliMusavirEtkisi?: string;
  aksiyonGerekiyor: boolean;
  maliMusavirEtkiPuani: number;
  durum: "yeni" | "okundu" | "sonra" | "gizlendi";
  createdAt: string;
}

export interface GibSyncLog {
  id: string;
  ofisId: string;
  syncTipi: "tebligat" | "beyanname" | "borc" | "mukellef" | "pdf";
  durum: "bekliyor" | "basarili" | "basarisiz";
  baslamaTarihi: string;
  bitisTarihi?: string;
  islenenKayitSayisi: number;
  hataMesaji?: string;
  createdBy: string;
}

// --- Audit Log --------------------------------------------------------------
export type AuditActorRole = UserRole | "system";
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "upload"
  | "send"
  | "seed"
  | "import"
  | "invite"
  | "match"
  | "sync"
  | "summarize";

export type AuditEntityType =
  | "musteri"
  | "gorev"
  | "tebligat"
  | "beyanname"
  | "tahsilat"
  | "tahakkuk"
  | "odeme"
  | "davet"
  | "banka_ekstresi"
  | "resmi_gazete"
  | "gib_sync"
  | "belge"
  | "rapor"
  | "gonderim"
  | "kdv2"
  | "sistem";

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel?: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

// ─── Hızlı Not ───────────────────────────────────────────────
export type NotRenk = "sari" | "mavi" | "yesil" | "pembe";

export interface Not {
  id: string;
  ofisId: string;
  icerik: string;
  renk: NotRenk;
  createdBy: string;
  createdByName: string;
  createdAt: string;
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
