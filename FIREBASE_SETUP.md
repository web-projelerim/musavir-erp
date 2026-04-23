# Firebase Kurulum Notlari

Bu proje Firebase Auth ve Firestore ile calisacak sekilde hazirlandi. Firebase env bilgileri yoksa uygulama demo/mock fallback modunda acilir; env bilgileri girildiginde Auth ve Firestore devreye girer.

## 1. Firebase Projesi

1. Firebase Console'da yeni proje olustur.
2. Web app ekle.
3. Firebase config degerlerini kopyala.
4. Authentication icinde Email/Password provider'ini aktif et.
5. Firestore Database olustur.
6. Storage'i aktif et.

## 2. Env Dosyasi

`.env.example` dosyasini referans alarak `.env.local` olustur:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## 3. Kullanici Kayitlari

Giris ekranindaki `Kayit Ol` modu Firebase Authentication uzerinden yeni mali musavir hesabi olusturur ve `kullanicilar/{uid}` dokumanini `musavir` roluyle yazar.

Personel ve mukellef hesaplari icin davet/rol yonetimi akisi henuz tamamlanmadigi icin test amacli olarak Firebase Authentication icinde su kullanicilari manuel olusturabilirsin:

- `ali@musavir.com`
- `selin@musavir.com`
- `ahmet@akdeniz.com`

Sifreleri Firebase Console'da kendin belirleyebilirsin. Lokal demo modunda varsayilan sifre alani `sifre123` olarak dolu gelir, ama Firebase aktifken Console'daki gercek sifre kullanilir.

## 4. Firestore Rules

Kurallar `firestore.rules` dosyasindadir. Firebase CLI kullaniyorsan:

```bash
firebase deploy --only firestore:rules
```

Storage kurallari icin:

```bash
firebase deploy --only storage
```

Not: Mevcut kurallar ilk kurulum kolayligi icin kullanicinin kendi dokumanini olusturmasina izin verir. Production oncesi bu bootstrap toleransi admin claim veya kapali davet sistemiyle sertlestirilmelidir.

## 5. Demo Veriyi Aktarma

1. Uygulamaya mali musavir hesabi ile gir.
2. `/ayarlar` sayfasina git.
3. Sistem Tercihleri sekmesinde `Demo Veriyi Firestore'a Aktar` butonuna bas.

Bu islem mock musteri, gorev, tebligat, beyanname, rapor, bildirim, tahsilat, KDV2, belge ve audit log kayitlarini Firestore koleksiyonlarina yazar.

Alternatif olarak terminalden:

```bash
npm run seed:firebase
```

Bu komut `.env.local` icindeki Firebase web config ile `ali@musavir.com / sifre123` hesabindan oturum acip mock verileri Firestore REST uzerinden yazar.

## 6. Koleksiyonlar

- `kullanicilar`
- `musteriler`
- `gorevler`
- `tebligatlar`
- `beyannameler`
- `raporlar`
- `bildirimler`
- `tahsilatlar`
- `kdv2`
- `gonderimler`
- `belgeler`
- `auditLogs`

## 7. Storage

Belgeler `belgeler/{musteriId}/{dosya}` yoluna yuklenir. Musavir/personel tum musteri belgelerini gorebilir; mukellef sadece kendi firma klasorune okuyup yazabilir.

## 8. Dogrulama

```bash
npm install
npm run build
npm run dev
```

Firebase env girilmediyse uygulama mock fallback ile calisir. Firebase env girildiyse listeleme ve yazma islemleri Firestore uzerinden akar.

## 9. Functions Kurulumu

Bu repoda artik `functions/` klasoru altinda Firebase Functions v2 paketi de vardir.

Hazir scheduler gorevleri:

- `processTahakkukNotifications`
  - Her gun 09:00'da vadesi gelen veya planlanmis tahakkuk WhatsApp kayitlarini isler.
- `refreshResmiGazeteSummaries`
  - Her gun 08:00'da Resmi Gazete ana sayfasindan ilgili basliklari cekip ozet koleksiyonuna yazar.
- `syncGibData`
  - Her gun 07:30'da GIB sync placeholder kaydi olusturur.

Manuel test endpoint'leri:

- `runTahakkukNotificationsNow`
- `runResmiGazeteNow`
- `runGibSyncNow`

Kurulum:

```bash
cd functions
npm install
```

Deploy:

```bash
firebase deploy --only functions
```

Opsiyonel yerel env:

`functions/.env.example` dosyasini kopyalayip asagidaki degerleri doldurabilirsin:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

Notlar:

- WhatsApp credential yoksa gonderim log'u simulated modda calisir.
- Resmi Gazete ozeti simdilik heuristic/adapter tabanlidir; ucretsiz AI provider anahtari geldikten sonra bu fonksiyon genisletilebilir.
- GIB tarafi resmi erisim bilgisi olmadan manual/mock modda kalir.
