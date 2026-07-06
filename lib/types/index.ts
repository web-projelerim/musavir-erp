// ─── Kullanıcı ve Rol ────────────────────────────────────────────
export type UserRole = "musavir" | "personel" | "mukellef";

export interface User {
  id: string;
  ofisId: string;
  ad: string;
  soyad: string;
  email: string;
  rol: UserRole;
  yetkiler?: KullaniciYetki[];
  avatar?: string;
  musteriId?: string;
  davetId?: string;
  aktif: boolean;
  /** SMMM / YMM ruhsat numarası — yalnızca musavir rolünde anlamlı */
  ruhsatNo?: string;
  /** Panel içi bildirim tercihleri; tanımsız tip açık kabul edilir */
  bildirimTercihleri?: BildirimTercihleri;
  createdAt: string;
  lastLoginAt?: string;
}

export type KullaniciYetki =
  | "portfoy_okuma"
  | "musteri_yazma"
  | "tahakkuk_yazma"
  | "belge_yonetimi"
  | "gib_okuma"
  | "rapor_yonetimi"
  | "vkn_goruntule";

export interface Ofis {
  id: string;
  unvan: string;
  vergiDairesi?: string;
  telefon?: string;
  email?: string;
  whatsappDurum: "pasif" | "hazirlik" | "aktif";
  gibDurum: "pasif" | "hazirlik" | "aktif";
  sgkKullaniciAdi?: string;
  /** Plaintext — yalnızca geçici; kaydedilmeden önce şifrelenir */
  sgkSifresi?: string;
  /** AES-256-GCM şifreli SGK şifresi — Firestore'a bu yazılır */
  sgkEncryptedSifre?: string;
  createdAt: string;
  updatedAt?: string;
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
  /** AES-256-GCM ile şifrelenmiş IVD parolası — cron job tarafından okunur */
  encryptedIvdSifre?: string;
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
  // Mesaj türü bazında otomatik gönderim / onay-bekle ayarı.
  // false (varsayılan) = müşavir onayı bekler; true = otomatik gönderilir
  tahakkukMesajiOtomatikGonder?: boolean;
  vadeHatirlatmaOtomatikGonder?: boolean;
  belgeEksikOtomatikGonder?: boolean;
  davetMesajiOtomatikGonder?: boolean;
  beyannameMesajiAktif?: boolean;
  beyannameMesajiOtomatikGonder?: boolean;
  raporMesajiAktif?: boolean;
  raporMesajiOtomatikGonder?: boolean;
  // Global anahtar: false ise hiçbir otomatik gönderim olmaz (acil durdurma)
  otomatikGonderimGloballeAcik?: boolean;
  // Müşavirin düzenlediği mesaj şablonları (tür → metin, {degisken} yer tutuculu).
  // Boş/tanımsız → lib/domain/mesajSablonlari.ts varsayılanı kullanılır.
  mesajSablonlari?: {
    tahakkuk?: string;
    vade?: string;
    belge?: string;
    davet?: string;
    beyanname?: string;
    rapor?: string;
  };
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

// ─── İş Kuyruğu / Sync Job Modeli ────────────────────────────
export type SyncJobTur = "gib_sync" | "luca_sync" | "rapor_uret" | "vade_hatirlatma" | "bildirim_gonder";
export type SyncJobDurum = "kuyrukta" | "calisiyor" | "tamamlandi" | "basarisiz" | "iptal";

/**
 * Uzun/tekrar edebilir işleri istemci akışı dışına taşımak için kuyruk kaydı.
 * Cloud Tasks / Pub-Sub veya basit bir worker cron'u bu kayıtları işleyebilir.
 * `idempotencyKey` aynı işin iki kez kuyruğa girmesini önler.
 */
export interface SyncJob {
  id: string;
  ofisId: string;
  tur: SyncJobTur;
  durum: SyncJobDurum;
  /** Aynı işin tekrarını önleyen benzersiz anahtar (ör. `gib_sync:ofis1:2026-06`) */
  idempotencyKey: string;
  /** İşe özel parametreler (musteriId, donem, vb.) */
  payload?: Record<string, unknown>;
  deneme: number;
  maxDeneme: number;
  sonHata?: string;
  /** Bir sonraki deneme zamanı (backoff) */
  sonrakiDeneme?: string;
  olusturan: string;
  createdAt: string;
  baslamaTarihi?: string;
  bitisTarihi?: string;
}

export type DavetDurum = "bekliyor" | "kullanildi" | "suresi_doldu" | "iptal";

export interface Davet {
  id: string;
  ofisId: string;
  rol: UserRole;
  email: string;
  musteriId?: string;
  musteriAdi?: string;
  /** Personel davetinde atanacak yetkiler; davet anında müşavir belirler. */
  yetkiler?: KullaniciYetki[];
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

/** Zaman içinde risk skorunun anlık görüntüsü — trend takibi için */
export interface RiskGecmisKaydi {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi?: string;
  skor: number;
  seviye: RiskSeviyesi;
  /** O anki başlıca risk sinyalleri (kısa etiketler) */
  sinyaller?: string[];
  tarih: string;
}

export type RiskAksiyonDurum = "acik" | "devam" | "tamamlandi" | "iptal";

/** Bir risk sinyaline karşı başlatılan aksiyon/görev bağlantısı */
export interface RiskAksiyon {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi?: string;
  baslik: string;
  aciklama?: string;
  seviye: RiskSeviyesi;
  durum: RiskAksiyonDurum;
  /** Bağlı görev id'si (aksiyon bir göreve dönüştüyse) */
  gorevId?: string;
  olusturan: string;
  createdAt: string;
  guncellenmeTarihi?: string;
}
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
  sorumluPersonel: string;        // Görüntüleme adı — eski kayıtlar için string kalıyor
  sorumluPersonelId?: string;     // User.id referansı — yeni kayıtlarda zorunlu
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
  vergiDairesi?: string;
  kurulusTarihi?: string;
  aciklama?: string;
  gibIvdKullaniciAdi?: string;
  gibEncryptedIvdSifre?: string;
  bankaGonderenAdlari?: string[];
  sgkSicilNo?: string;
  // Kurum bilgileri (resmi sistem erişimleri)
  kurumVergiDairesi?: string;
  sgkKullaniciAdi?: string;
  sgkSifresi?: string; // TODO(faz-2): şifreli sakla (lib/integrations/gib/encrypt.ts gibi)
  ebildirgKullaniciAdi?: string;
  ebildirgSifresi?: string;
  edevletKullaniciAdi?: string;
  edevletSifresi?: string;
  gibSifresi?: string; // gibIvdKullaniciAdi ile birlikte plaintext (geçici; şifreli versiyonu gibEncryptedIvdSifre)
  // Genişletilmiş mükellef alanları
  sahissaVergiNo?: string;
  eposta1?: string; eposta1Ad?: string;
  eposta2?: string; eposta2Ad?: string;
  eposta3?: string; eposta3Ad?: string;
  gsm1?: string; gsm1Ad?: string;
  gsm2?: string; gsm2Ad?: string;
  gsm3?: string; gsm3Ad?: string;
  vergiTurleri?: Record<string, string>;
  gruplar?: string[];
  eDefter?: string;
  eDefterGecis?: string;
  naceKodu?: string;
  mudurGorevBitisTarihi?: string;
  maliMuhurler?: { sn: string; bitisTarihi: string }[];
  panelGirisAktif?: boolean;
  ikiAdimliDogrulama?: boolean;
  ikiAdimliYontem?: string;
  dogumTarihi?: string;
  acilisTarihi?: string;
  kapanisTarihi?: string;
  girisMailGonder?: boolean;
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

export interface AltGorev {
  id: string;
  baslik: string;
  tamamlandi: boolean;
  tamamlanmaTarihi?: string;
  tahminiSure?: number; // dakika
}

export interface GorevNot {
  id: string;
  metin: string;
  tarih: string;
  yazar?: string;
}

export interface Gorev {
  id: string;
  ofisId: string;
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
  altGorevler?: AltGorev[];
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
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  tip: RaporTip;
  donem: string;
  /** Dönem aralığı (ISO tarih, dahil) — rapor içeriğini bu aralığa filtrelemek için. Yoksa (eski kayıtlar) tüm zamanlar gösterilir. */
  donemBaslangic?: string;
  donemBitis?: string;
  durum: RaporDurum;
  olusturmaTarihi: string;
  gonderimTarihi?: string;
  kanal?: "whatsapp" | "email" | "panel";
  pdfUrl?: string;
  pdfStoragePath?: string;
  /** Bu raporu üreten şablon id'si (varsa) */
  sablonId?: string;
}

/** Rapor şablonunda yer alacak içerik bölümleri (aç/kapat) */
export type RaporBolumKey =
  | "ozet"
  | "musteri_bilgileri"
  | "gorevler"
  | "beyannameler"
  | "tahsilatlar"
  | "tebligatlar"
  | "risk";

export interface RaporSablon {
  id: string;
  ofisId: string;
  ad: string;
  tip: RaporTip;
  /** Rapora dahil edilecek bölümler (sıralı) */
  bolumler: RaporBolumKey[];
  /** Başlık/altbilgi gibi serbest metin alanları */
  ustBaslik?: string;
  altNot?: string;
  /** VKN/TCKN maskeleme zorunlu mu (yetkiden bağımsız) */
  vknMaskeliZorla?: boolean;
  varsayilan?: boolean;
  olusturan: string;
  createdAt: string;
  guncellenmeTarihi?: string;
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
  /** Tevkifat türü key'i (lib/domain/tevkifat.ts) — eski kayıtlarda boş olabilir */
  tevkifatTuru?: string;
  /** Satıcıya ödenecek (tevkifat sonrası kalan) KDV */
  saticiyaOdenenKdv?: number;
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

export type BelgeOnayDurum = "bekliyor" | "onaylandi" | "reddedildi";

export interface BelgeVersiyon {
  versiyon: number;
  url: string;
  storagePath?: string;
  boyut: number;
  yukleyen: string;
  not?: string;
  createdAt: string;
}

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
  /** Aktif versiyon numarası (1'den başlar) */
  versiyon?: number;
  /** Geçmiş versiyonlar (en yeni sonda). Aktif versiyon `url`/`storagePath`te tutulur. */
  versiyonlar?: BelgeVersiyon[];
  /** Müşavir onay durumu — mükellefin yüklediği belgeler için */
  onayDurum?: BelgeOnayDurum;
  onaylayan?: string;
  onayTarihi?: string;
  onayNotu?: string;
  createdAt: string;
}

export type BelgeTalepDurum = "acik" | "yuklendi" | "tamamlandi" | "iptal";

/** Müşavirin mükellepten belge istemesi — belge talep akışı */
export interface BelgeTalep {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  baslik: string;
  aciklama?: string;
  kategori?: BelgeKategori;
  durum: BelgeTalepDurum;
  talepEden: string;
  /** Talebi karşılayan yüklenen belge id'si */
  belgeId?: string;
  sonTarih?: string;
  createdAt: string;
  guncellenmeTarihi?: string;
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
export type TahakkukKaynakSistem = "manual" | "gib" | "luca" | "sgk";

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
  tutar: number; // Brüt tutar (KDV dahil)
  odenenTutar?: number;
  // Türmob hesabı (opsiyonel — eski kayıtlarda undefined olabilir)
  netTutar?: number;
  kdvTutar?: number;
  kdvOrani?: number;
  stopajTutar?: number;
  stopajOrani?: number;
  tahsilEdilecek?: number;
  vadeTarihi: string;
  durum: TahakkukDurum;
  bildirimDurumu: TahakkukBildirimDurum;
  panelLinki: string;
  aciklama?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── GİB Sözleşmeleri (Beyanname ve YMM) ─────────────────────────────────────
export type SozlesmeTuru = "beyanname" | "ymm";
export type SozlesmeDurum = "gecerli" | "sonlanmis" | "iptal";

export interface GibSozlesme {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  vknTckn: string;
  sozlesmeTuru: SozlesmeTuru;
  sozlesmeNo: string;
  basTarihi: string; // YYYY-MM-DD
  bitTarihi?: string;
  aylikUcret?: number; // Brüt aylık (KDV dahil)
  kdvOrani?: number;
  durum: SozlesmeDurum;
  kaynak: "gib" | "manual";
  kaynakSistem?: string; // İVD modülü adı
  pdfUrl?: string;
  syncTarihi: string;
  createdAt: string;
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

/** Kullanıcı bazlı bildirim tercihleri — tip başına aç/kapat. Tanımsız tip = açık. */
export type BildirimTercihleri = Partial<Record<BildirimTip, boolean>>;

export interface Bildirim {
  id: string;
  ofisId?: string;
  tip: BildirimTip;
  baslik: string;
  mesaj: string;
  durum: BildirimDurum;
  tarih: string;
  link?: string;
  /** Görsel önceliklendirme için (ör. karşıt inceleme tutanağı → kritik) */
  onemDerecesi?: "normal" | "yuksek" | "kritik";
  tebligatId?: string;
  musteriId?: string;
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
  | "beyanTakipHucresi"
  | "sistem";

export interface AuditLog {
  id: string;
  /** Çok-kiracılı izolasyon + firestore.rules (sameOffice) için zorunlu. */
  ofisId?: string;
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
  /** Ofisin dışında da görebilecek e-posta adresleri (paylaşım listesi) */
  paylasilanEmails?: string[];
  /** Bu notu onaylayan kişiler */
  tikleyenler?: NotTikleyen[];
}

export interface NotTikleyen {
  email: string;
  ad: string;
  tarih: string;
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

// ─── Beyanname Takip Grid ───────────────────────────────────

export type BeyanTakipDurum =
  | "bos"
  | "evrak_bekleniyor"
  | "hazirlaniyor"
  | "kontrol"
  | "gonderildi"
  | "tamamlandi"
  | "sorun";

export interface BeyanTakipHucresi {
  id: string;
  ofisId: string;
  musteriId: string;
  vergiTuruKey: string;
  donem: string;
  durum: BeyanTakipDurum;
  /** Tahakkuk fişi işlendi mi (B/T matrisindeki T işareti). Beyandan (durum) bağımsız izlenir. */
  tahakkukYapildi?: boolean;
  guncellenmeTarihi: string;
  guncelleyenAd?: string;
  beyannameId?: string;
  pdfUrl?: string;
  tahakkukFisUrl?: string;
  vergiTutari?: number;
}

export type BeyanTakipNotTur = "gecici" | "kalici";

export interface BeyanTakipNotu {
  id: string;
  ofisId: string;
  musteriId: string;
  donem: string;
  tur: BeyanTakipNotTur;
  icerik: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type BeyanTakipKolonPeriyot = "aylik" | "ucaylik" | "yillik";

export interface BeyanTakipKolon {
  key: string;
  label: string;
  sonGun: number | "son_gun";
  periyot: BeyanTakipKolonPeriyot;
  gorunurAylar?: number[];
  grup: "kdv" | "muhtasar" | "gelir_kurumlar" | "otv" | "diger" | "bildirim";
  sira: number;
}
