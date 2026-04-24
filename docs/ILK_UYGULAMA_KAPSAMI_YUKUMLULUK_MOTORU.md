# Ilk Uygulama Kapsami

## Secilen Ilk Modul

Ilk uygulanacak modül:

- yukumluluk motoru
- musteri mukellefiyet profili
- beyan olusumunun temel takvim mantigi

## Neden Buradan Basliyoruz

Bu modül gelmeden:

- risk merkezi gercek sinyal uretemez
- beyan ekrani operasyonel kuyruk olamaz
- tebligat ekrani baglamsiz kalir
- personel gorevleri reaktif kalir

## MVP Kapsami

### 1. Veri Modeli

`lib/types/index.ts` icine:

- `MukellefiyetProfili`
- `Yukumluluk`
- `YukumlulukTipi`
- `YukumlulukDurumu`

eklenecek.

### 2. Mock ve Firebase Katmani

- `COLLECTIONS.mukellefiyetProfilleri`
- `COLLECTIONS.yukumlulukler`
- repository create/update fonksiyonlari
- mock veri ornekleri
- `useAppData` abonelikleri

### 3. Domain Kurali

Ilk surum kurallari:

- `kdvMukellef = true` ise aylik KDV yukumlulugu
- `muhtasarMukellef = true` ise aylik Muhtasar yukumlulugu
- `gecikmisPesinat = true` ise gecici/vergi takip sinyali
- musteri durum = `pasif` ise yeni yukumluluk uretme

Ilk surum bilerek sade tutulacak; amac sistemi calistirmak.

### 4. UI

Musteri detayina yeni sekme:

- `Yukumlulukler`

Icerik:

- donem
- tip
- son tarih
- durum
- bagli beyan olustu mu

Ek olarak yeni sayfa:

- `/yukumlulukler`

Liste:

- tum ofis yukumlulukleri
- filtre: tip, durum, donem, sorumlu

### 5. Otomasyon

Ilk surum scheduler gerektirmiyor.

Yukumlulukler:

- musteri kaydi olustugunda
- musteri guncellendiginde
- manuel "yeniden olustur" aksiyonunda

uretilecek.

## Kabul Kriterleri

1. Bir musteri icin profil kaydi tutulabiliyor olmali.
2. Profil kurallarindan otomatik yukumluluk uretilmeli.
3. Yukumlulukler listede ve musteri detayinda gorunmeli.
4. Risk merkezi sonraki asamada bu veriyi tuketebilecek sekilde hazir olmali.

## Sonraki Adim

Bu belge tamamlandiktan sonra dogrudan kod uygulamasi baslayacak.
