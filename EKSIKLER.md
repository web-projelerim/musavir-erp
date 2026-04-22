# MusavirERP - Eksikler ve Riskler Listesi

Tarih: 2026-04-22

Bu dokuman, mevcut uygulamada eksik kalan veya canli kullanima gecmeden once risk tasiyan alanlari listeler. To-do listesi is sirasini verir; bu dosya ise hangi bosluklarin urun, guvenlik veya operasyon riski yarattigini aciklar.

## Kritik Eksikler

- Gercek Firebase projesiyle uc uca test henuz yapilmadi; repo ortam degiskenleri olmadan demo fallback ile calisabiliyor.
- Firebase Auth kullanicilari ile `kullanicilar/{uid}` dokumanlari arasindaki production eslestirme henuz kurulmus degil.
- `firestore.rules` ilk calisir hale getirme icin uygun, fakat production icin sertlestirilmesi gerekiyor.
- Demo veriyi Firestore'a aktarma aksiyonunda tekrarli calistirma senaryosu dikkatle test edilmeli.
- Rapor icin PDF uretim ve Storage'a yazma akisi eklendi; gercek Firebase ortaminda upload/read yetkileri uc uca test edilmeli.
- Belge/dosya yukleme modulu eklendi; gercek Firebase Storage ortaminda upload/read/delete yetkileri uc uca test edilmeli.
- Degisiklikler henuz commitlenmedi ve uzak repoya pushlanmadi.

## Fonksiyonel Eksikler

- Dashboard grafikleri beyanname, tahsilat ve musteri risk kayitlarindan uretiliyor; rapor bazli ileri grafikler henuz eklenmedi.
- Gorev notu, duzenleme, iptal, silme ve Kanban surukle-birak akislari eklendi; gercek Firebase ortaminda yetki kurallariyla uc uca test edilmeli.
- Yeni tebligat, yaklasan/geciken beyanname, geciken tahsilat ve eksik beyanname belgesi icin otomatik gorev onerisi/uretimi eklendi; belge talep/onay akisi ayrica detaylandirilmali.
- Tebligat PDF goruntuleme baglantisi ve detay modal'i eklendi; gercek GIB PDF referanslariyla uc uca test edilmeli.
- Beyanname yaklasan/geciken hesaplari aktif donem tarihine tam baglanmadi.
- Tahsilat olusturma ve kismi odeme akisi eklendi; kalan bakiye raporlama ve toplu tahsilat ekrani detaylandirilmali.
- Risk skoru sinyal bazli domain servisinden hesaplanmaya basladi; risk gecmisi modeli ve aksiyon baslatma akislari henuz eksik.
- KDV2 oranlari hizmet/fatura tipine gore kapsamli secilmiyor.
- KDV2 kayitlari icin duzenleme/silme ve audit log denetim izi eklendi; hizmet/fatura tipine gore kapsamli tevkifat oranlari henuz detaylandirilmadi.
- Ayarlar ekranindaki bildirim tercihleri kalici degil.
- Ayarlar ekraninda sifre degistirme akisi tamamlanmadi.
- Mukellef panelinde dosya yukleme/goruntuleme ve rapor PDF indirme eklendi; gercek Firebase ortaminda dosya linkleri test edilmeli.

## Entegrasyon Eksikleri

- WhatsApp Business gercek provider baglantisi yok; su anda local/mock provider arayuzu var.
- WhatsApp webhook, retry, provider template id ve teslim/okundu durumlari yok.
- GIB entegrasyonu yok; tebligat, beyanname durumu ve PDF referansi manuel/mock kalir.
- Luca entegrasyonu yok; musteri, muhasebe, fatura veya finansal ozet senkronizasyonu yapilmiyor.
- Queue/worker altyapisi yok; rapor uretimi ve sync isleri tarayici/istemci akisi disina tasinmadi.
- Sync log modeli yok.

## Veri Modeli Eksikleri

- `auditLogs` denetim izi koleksiyonu eklendi; daha detayli alan bazli fark gorunumu ve export henuz yok.
- Belge/ek dosya modeli eklendi; versioning, onay durumu ve belge talep akisi henuz yok.
- Rapor sablon modeli yok.
- Entegrasyon oturumu ve sync log modeli yok.
- Tahsilat icin parca odeme modeli eksik.
- Risk sinyali ve risk gecmisi modeli eksik.
- Kullanici davet/aktivasyon modeli yok.
- Bildirim tercihleri icin kullanici bazli kalici ayar modeli eksik.

## Guvenlik Riskleri

- Firestore rules production icin daha detayli test edilmeli; ozellikle rol ve mukellef kapsam kontrolleri.
- Admin/rol yonetimi istemci tarafindan degil, guvenilir claim veya kontrollu backend sureciyle desteklenmeli.
- VKN/TCKN ve finansal veriler icin maskeleme ve alan bazli yetki kurallari yok.
- App Check veya benzeri kotuye kullanim korumasi yok.
- Kritik aksiyonlar icin audit log eklendi; production ortaminda backend/claim tabanli degistirilemez log stratejisi degerlendirilmeli.
- Sifre degistirme, kullanici daveti ve hesap kapatma akislari eksik.
- Entegrasyon credential'larinin nerede ve nasil saklanacagi netlesmedi.

## Kalite ve Operasyon Eksikleri

- Unit test yok.
- E2E smoke test yok.
- CI akisi yok.
- `npm install` sonrasi kritik/yuksek seviye guvenlik uyarilari raporlandi; dependency guncellemesi gerekiyor.
- Next.js surumu guvenlik ve bakim acisindan guncellenmeli.
- Staging/production ortam ayrimi ve deploy proseduru yazilmadi.
- Hata izleme, loglama ve monitoring yok.
- Backup/restore veya veri geri alma stratejisi yok.
- Git durumunda cok sayida untracked/modified dosya var; degisikliklerin commit stratejisi netlesmeli.

## UX ve Arayuz Eksikleri

- Mobilde sidebar/drawer davranisi sertlestirilmeli.
- Loading, error ve empty state'ler ekranlar arasinda tutarsiz.
- Dosya, PDF ve entegrasyon butonlarinin bir kismi henuz gercek aksiyona bagli degil.
- Uzun metin, dar ekran ve tablo tasma kontrolleri tekrar gozden gecirilmeli.
- Klavye ile gezinti, focus state, aria label ve kontrast kontrolleri eksik.
- Bildirimler ve global arama calisiyor, fakat son kullanici deneyimi icin detayli hata/sonuc durumlari iyilestirilmeli.

## En Oncelikli Kapatilacak Bosluklar

1. Gercek Firebase projesiyle auth, rules, seed ve temel CRUD smoke testi.
2. Belge talep akisi ve tebligat/GIB PDF referanslarinin uc uca testi.
3. Gorev notlari, gorev CRUD ve tahsilat CRUD eksiklerinin kapanmasi.
4. Risk gecmisi modeli, riskten aksiyon baslatma ve KDV2 domain servisinin derinlestirilmesi.
5. Rol yonetimi, Firestore rules sertlestirme ve audit log export/fark gorunumu.
6. WhatsApp Business gercek provider baglantisi.
7. Unit/e2e testler, CI ve dependency guvenlik guncellemeleri.
