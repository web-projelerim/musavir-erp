# MusavirERP - Mobil Iyilestirme Plani

Tarih: 2026-04-23

Bu plan, MusavirERP'nin mobilde gunluk kullanima daha uygun, hizli ve kurulum yapilabilir bir deneyim sunmasi icin hazirlandi. Oncelik; mali musavir, personel ve mukellef rollerinin telefondan en sik yaptigi islemleri az dokunusla tamamlamasidir.

## Mevcut Durum

- Müşavir panelinde sidebar mobilde drawer davranisina geçti.
- Genel durum metrikleri dashboard, raporlar, risk ve tebligatlar sayfalarinda soldan acilir/kapanir panele tasindi.
- Uygulama icin PWA manifest, service worker ve 192/512 uygulama ikonlari eklendi.
- Giriş ekranı ve temel layout responsive calisiyor.
- Bazi tablo ve form ekranlari mobilde hala dar alan, uzun metin ve islem butonu yogunlugu nedeniyle iyilestirme gerektiriyor.

## P0 - Kritik Mobil Kullanilabilirlik

- [ ] Tum ana rotalari 390x844 ve 430x932 viewport ile tek tek kontrol et: `/dashboard`, `/musteriler`, `/musteriler/[id]`, `/gorevler`, `/tebligatlar`, `/raporlar`, `/risk`, `/kdv2`, `/ayarlar`, `/panel`.
- [ ] Tablolari mobilde kart/list gorunumune cevir: satirlar yatay scroll yerine okunabilir kartlar olarak aksin.
- [ ] Sayfa baslik aksiyonlarini mobilde alt alta veya iki kolonlu yap; butonlar ekran disina tasmasin.
- [ ] Filtre/select alanlarini mobilde tek satira sikistirmak yerine tam genislik ve alt alta kullan.
- [ ] Modal/drawer iceriklerinde `max-height`, ic scroll ve sabit footer aksiyonlari ekle.
- [ ] Form inputlari icin minimum dokunma alani 44px olsun.
- [ ] Uzun firma adi, belge adi, rapor tipi ve tebligat basliklarinda tasma/truncate davranisini standartlastir.

Kabul kriteri:

- Mobilde ana aksiyonlar yatay kaydirma gerektirmeden kullanilir.
- Her ekranda en fazla bir ana scroll akseni olur.
- Buton metinleri ve badge'ler kesilmez.

## P1 - Mobil Navigasyon ve Hız

- [ ] Alt sabit hizli aksiyon cubugu ekle: Dashboard, Müşteriler, Görevler, Bildirimler.
- [ ] Mobilde global aramayi tam ekran command sheet olarak ac.
- [ ] Müşteri detay sayfasinda sekmeleri yatay scroll yerine segment/accordion yap.
- [ ] Geri donus ve breadcrumb davranisini mobilde sadeleştir.
- [ ] Kritik bildirimleri mobilde ustten toast yerine okunabilir bottom sheet/inline alert olarak goster.
- [ ] PWA install durumunu algilayan "Uygulamayi yukle" butonu ekle.

Kabul kriteri:

- Kullanici en sik ekranlara tek dokunusla ulasir.
- Arama ve filtre mobilde ekrani bozmadan calisir.
- PWA kurulumu kullaniciya gorunur bir aksiyonla sunulur.

## P2 - Mobil Veri Sunumu

- [ ] Dashboard grafiklerini mobilde daha kisa yukseklik ve sade legend ile goster.
- [ ] Risk siralamasini mobilde skor, seviye ve ilk 2 sinyal odakli kartlara cevir.
- [ ] Tebligat ve beyanname listelerinde acil durumlari en uste sabitle.
- [ ] Rapor listesinde PDF indir/gonder aksiyonlarini satir ici ikon kalabaligi yerine aksiyon menusu yap.
- [ ] Gorev Kanban'i mobilde kolonlar arasi swipe veya durum filtresiyle kullanilir hale getir.
- [ ] KDV2 formunda hesap sonucunu sticky ozet kutusu olarak goster.

Kabul kriteri:

- Her kartta tek bakista karar vermeye yetecek bilgi gorunur.
- Detay bilgi kart acilinca veya detay sayfasinda verilir.

## P3 - Mobil Form ve Dosya Akışları

- [ ] Belge yukleme mobilde kamera/dosya secimini net desteklesin.
- [ ] PDF/rapor goruntuleme mobilde yeni sekme, indir ve paylas aksiyonlariyla sunulsun.
- [ ] Tahsilat ve gorev formlarinda zorunlu alanlar mobilde ilk ekranda gorunsun.
- [ ] Hata mesajlari input altinda ve form ustunde ozet olarak gorunsun.
- [ ] Kayit/giris ekraninda klavye acildiginda form aksiyonlari ekran disina kaymasin.

Kabul kriteri:

- Mobilde belge yukleme, gorev olusturma ve tahsilat kaydi tek elle tamamlanabilir.
- Form validasyonlari kullaniciyi hangi alani duzeltecegine dogrudan goturur.

## P4 - PWA ve Offline Hazirlik

- [x] Manifest, service worker ve PWA ikonlarini ekle.
- [ ] Uygulama yukleme butonu ekle ve `beforeinstallprompt` eventini yakala.
- [ ] Offline durum banner'i ekle.
- [ ] Son goruntulenen musteri/gorev/rapor listesini read-only cache olarak sakla.
- [ ] Yeni veri yazma islemlerinde offline queue stratejisini degerlendir.
- [ ] iOS Safari icin "Ana Ekrana Ekle" yonlendirmesi hazirla.

Kabul kriteri:

- Chrome/Edge uzerinden uygulama kurulabilir gorunur.
- Kullanici offline oldugunu anlar ve veri kaybi riski yasamaz.

## P5 - Mobil Kalite ve Test

- [ ] Playwright mobil smoke testi ekle: 390x844 dashboard, musteriler, gorevler, raporlar, tebligatlar, panel.
- [ ] Lighthouse PWA ve mobile performance kontrolu yap.
- [ ] Touch target, contrast ve keyboard navigation kontrollerini listeye bagla.
- [ ] Android Chrome ve iOS Safari manuel test notlarini dokumana ekle.
- [ ] Uzun veri setiyle performans kontrolu yap: 100 musteri, 300 gorev, 500 belge.

Kabul kriteri:

- Mobil smoke test CI'a eklenebilir hale gelir.
- PWA kurulabilirlik ve temel erisilebilirlik kriterleri raporlanir.

## Onerilen Uygulama Sirasi

1. P0 tablo/kart donusumleri ve form tasma problemlerini kapat.
2. P1 mobil navigasyon ve arama deneyimini iyilestir.
3. P2 veri kartlarini role ve ekrana gore sadeleştir.
4. P3 belge, rapor ve form akislarini tek elle kullanilabilir hale getir.
5. P4 PWA install butonu, offline banner ve cache stratejisini ekle.
6. P5 Playwright mobil smoke, Lighthouse ve cihaz testlerini standartlastir.

## Ilk Teknik Paket

- [ ] `ResponsiveTable` veya `DataList` ortak bileseni olustur.
- [ ] Dashboard, tebligatlar, raporlar ve risk listelerini bu bilesene tasir.
- [ ] PWA install butonu icin `InstallAppButton` bileseni ekle.
- [ ] Mobil smoke script'i ekle: `npm run smoke:mobile`.
- [ ] Lighthouse PWA raporunu dokumana bagla.
