# MusavirERP Teknik Tasarim

## Amaç

Bu belge, mali musavir surec odakli urun gereksinimlerini kod tabaninda uygulanabilir mimariye cevirir.

## Mevcut Durum Ozeti

Repo icinde su ana temel hazir:

- cok kullanicili ofis yapisi icin `ofisId`
- `davetler`, `tahakkuklar`, `odemeler`, `bankaEkstreleri`, `resmiGazeteOzetleri`, `gibSyncLogs`
- musteri merkezli detay sayfasi
- banka ekstre import MVP'si
- tahakkuk bildirimi ve scheduler iskeleti

Eksik taraf:

- yukumluluk ve takvim uretimi
- beyanname asama bazli yasam dongusu
- tebligat SLA modeli
- resmi vergi tahakkugu ile hizmet tahakkugu ayrimi
- entegrasyon durumlarinin gercek domain modeline baglanmasi

## Mimari Ilke

Sistem uc katmanli ilerlemeli:

1. `master data`
   - ofis
   - kullanici
   - musteri
   - mukellefiyet profili

2. `operational workflow`
   - yukumluluk
   - beyanname dosyasi
   - tebligat aksiyonu
   - belge talebi
   - hizmet tahakkugu
   - vergi tahakkugu
   - odeme/eslestirme

3. `integration and intelligence`
   - GIB adapter
   - Luca adapter
   - scheduler
   - AI destek servisleri

## Onerilen Koleksiyonlar

### Korunacak Koleksiyonlar

- `ofisler`
- `kullanicilar`
- `musteriler`
- `gorevler`
- `belgeler`
- `davetler`
- `auditLogs`

### Revize Edilecekler

#### `beyannameler`

Mevcut durum yerine asagidaki alanlar eklenmeli:

- `yasamDongusuDurum`
- `hazirlamaDurum`
- `gonderimDurum`
- `onayDurum`
- `tahakkukFisNo`
- `tahakkukFisTarihi`
- `odemeSonTarihi`
- `kaynakSistem`
- `kaynakRef`
- `duzeltmeTipi`
- `olusturanYukumlulukId`

#### `tebligatlar`

- `ulasmaTarihi`
- `tebligEdilmisSayilmaTarihi`
- `kritikSonTarih`
- `aksiyonTipi`
- `aksiyonSahibiId`
- `onemDerecesi`
- `ilgiliBeyannameId`
- `ilgiliVergiTahakkukuId`
- `sonuc`

#### `tahakkuklar`

Mevcut koleksiyon ikiye ayrilmali:

- `hizmetTahakkuklari`
- `vergiTahakkuklari`

### Yeni Koleksiyonlar

#### `mukellefiyetProfilleri`

Musteri bazli operasyonel profil:

- `musteriId`
- `ofisId`
- `sirketTuru`
- `vergiTurleri`
- `beyanPeriyotlari`
- `sgkYukumlulugu`
- `eTebligatDurumu`
- `eBelgeRolleri`
- `lucaFirmaKodu`
- `gibEtiketleri`
- `aktif`

#### `yukumlulukler`

Sistemin dogrudan uretecegi is kaydi:

- `musteriId`
- `ofisId`
- `tip`
- `donem`
- `planlananBaslangic`
- `sonTarih`
- `durum`
- `sorumluId`
- `kaynakKural`
- `bagliBeyannameId`
- `bagliBelgeTalebiIds`

#### `belgeTalepleri`

- `musteriId`
- `ofisId`
- `bagliYukumlulukId`
- `kategori`
- `istenenBelgeler`
- `durum`
- `sonTarih`
- `gonderimKanali`
- `yanitTarihi`

#### `tebligatAksiyonlari`

- `tebligatId`
- `atananKisiId`
- `aksiyonTipi`
- `durum`
- `sonTarih`
- `tamamlanmaTarihi`
- `notlar`

#### `tahsilatEslesmeKararlari`

- `ekstreId`
- `satirId`
- `odemeId`
- `karar`
- `kararVerenId`
- `guvenSkoru`
- `gerekce`

## Domain Servisleri

`lib/domain` altinda yeni servisler:

- `yukumluluk.ts`
  - musteri profilinden aylik/yillik yukumluluk uretir
- `beyanWorkflow.ts`
  - beyan durum gecislerini kontrol eder
- `tebligatSla.ts`
  - teblig edilmis sayilma tarihi ve aksiyon son tarihlerini hesaplar
- `vergiTahakkuk.ts`
  - beyanname bazli resmi tahakkuk modelini normalize eder
- `tahsilatMutabakat.ts`
  - mevcut banka eslestirmeyi ofis alacagi acisindan gelistirir
- `riskV2.ts`
  - operasyonel ve uyum risklerini yeniden puanlar

## UI Kırılımı

### Yeni Ekranlar

- `/bugun`
- `/beyan-kuyrugu`
- `/tebligat-masasi`
- `/odeme-mutabakati`
- `/belge-bekleyenler`
- `/yukumlulukler`

### Revize Ekranlar

- `/risk`
  - yalniz skor tablosu degil, risk nedenleri + is yuk etkisi
- `/tebligatlar`
  - yeni bir triage ve SLA merkezi
- `/tahakkuklar`
  - hizmet tahakkuku ile vergi tahakkugunu ayri goster
- `/musteriler/[id]`
  - musteri ana merkezi olarak kalsin ama yukumluluk ve belge taleplerini de ekle

## Yetki Modeli

Su yeni yetkiler eklenmeli:

- `beyan_hazirlama`
- `beyan_onay_goruntuleme`
- `tebligat_aksiyon_yonetimi`
- `tahsilat_onay`
- `vergi_tahakkuk_okuma`
- `mukellef_portal_yonetimi`

## Entegrasyon Yaklasimi

### GIB

GIB entegrasyonu ilk fazda okuyucu/ref referans modeli olarak kurulacak:

- tebligat sync
- beyanname durum sync
- tahakkuk/borc goruntuleme
- PDF referans baglantisi

Gercek resmi erisim bilgileri olmadan scraping katmani urune sokulmayacak.

### Luca

Luca entegrasyonu ilk fazda:

- musteri referans kodu
- beyanname durum karsilastirmasi
- tahakkuk fis referansi
- rapor veya export baglantisi

olarak kurgulanacak.

## Teknik Fazlandirma

### Sprint 1

- `mukellefiyetProfilleri`
- `yukumlulukler`
- `yukumluluk.ts`
- musteri detayina yukumluluk sekmesi

### Sprint 2

- `beyanWorkflow.ts`
- beyan yasam dongusu UI
- `belgeTalepleri`

### Sprint 3

- `tebligatSla.ts`
- tebligat masasi
- kritik tarih hesaplama

### Sprint 4

- `hizmetTahakkuklari` ve `vergiTahakkuklari` ayrimi
- tahsilat mutabakati V2

## Dogrudan Kod Etkisi Olan Dosyalar

Bu genisleme ilk etapta su dosya gruplarina dokunacak:

- `lib/types/index.ts`
- `lib/domain/*`
- `lib/firebase/firestore.ts`
- `lib/firebase/repositories.ts`
- `lib/hooks/useAppData.ts`
- `app/(musavir)/risk/page.tsx`
- `app/(musavir)/tebligatlar/page.tsx`
- `app/(musavir)/tahakkuklar/page.tsx`
- `app/(musavir)/musteriler/[id]/page.tsx`
- yeni ekran klasorleri

## Teknik Karar

Ilk uygulanacak modul:

- `mukellefiyetProfilleri` + `yukumlulukler`

Cunku bu moduller gelmeden beyan, tebligat ve risk ekranlari gercek operasyon mantigina kavusamaz.
