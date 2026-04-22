# MusavirERP - Detayli Yeni To-Do ve Eksikler Listesi

Tarih: 2026-04-22

Bu dosya mevcut arayuz, Firebase katmani, belge/rapor/gorev/tahsilat/KDV2 gelistirmeleri ve son statik asset sorunu baz alinarak hazirlandi. Amac, uygulamayi demo calisan prototipten gercek musteriyle kullanilabilir MVP seviyesine tasimak.

## Guncel Durum Ozeti

- Next.js app router arayuzu var: giris, dashboard, musteriler, musteri detay, gorevler, tebligatlar, raporlar, risk, KDV2, ayarlar ve mukellef paneli.
- Firebase Auth, Firestore ve Storage entegrasyon katmani eklendi; env yoksa demo fallback calisiyor.
- Firestore repository ve hook katmani temel koleksiyonlari kapsiyor: musteriler, gorevler, tebligatlar, beyannameler, tahsilatlar, raporlar, belgeler, KDV2, gonderimler, bildirimler, kullanicilar ve auditLogs.
- Belge yukleme/goruntuleme/silme, rapor PDF uretimi, gorev CRUD/not/Kanban, tahsilat CRUD, tebligat detay/PDF, risk domain servisi, otomatik gorev kurallari, audit log ve KDV2 duzenleme/silme eklendi.
- Son kirik CSS/JS durumu, `.next` klasorunun production build kalintisi ile dev server asset yollarinin karismasindan kaynaklandi; temiz dev restart ile duzeldi.
- Favicon/static ikon eksigi giderildi; tekrar eden dev asset karisikligi icin `npm run dev:clean` script'i eklendi.

## P0 - Stabilizasyon ve Kirik Ekranlari Kapatma

- [x] Dev serverdaki CSS/JS 404 sorununu temiz `.next` + yeniden baslatma ile gider.
- [x] `favicon.ico` 404 sorununu kapat.
- [x] Temiz dev calistirma komutu ekle: `npm run dev:clean`.
- [x] Build sonrasi dev server kullanilacaksa dokumana "build'den sonra dev'i temiz yeniden baslat" notu ekle.
- [x] Ana rota smoke testlerini yap: `/giris`, `/dashboard`, `/musteriler`, `/gorevler`, `/tebligatlar`, `/raporlar`, `/risk`, `/kdv2`, `/ayarlar`, `/panel`.
- [ ] Loading, error ve empty state'leri ekranlar arasinda standartlastir.
- [x] Mobil ve dar ekran kontrollerini yap; sidebar mobilde drawer davranisina gecsin.
- [ ] Uzun tablo, uzun musteri adi, uzun belge adi ve dar ekran tasma kontrollerini kapat.

Kabul kriteri:

- Ana rotalar 200 doner.
- Console'da `_next/static/...` ve `favicon.ico` 404 hatasi kalmaz.
- Gorsel olarak giris ekrani Tailwind stilleriyle render olur.
- Build/dev gecisinden sonra ayni asset problemi tekrarlanmaz.

## P1 - Gercek Firebase Uc Uca Dogrulama

- [ ] `.env.local` dosyasini gercek Firebase web app bilgileriyle doldur.
- [ ] Firebase Authentication'da mali musavir, personel ve mukellef test kullanicilarini olustur.
- [ ] Her Auth kullanicisi icin `kullanicilar/{uid}` dokumani olustur: `rol`, `adSoyad`, `eposta`, `musteriId`, `aktif`.
- [ ] `firestore.rules` ve `storage.rules` dosyalarini Firebase projesine deploy et.
- [ ] Ayarlar ekranindan seed/demo veriyi Firestore'a aktar ve tekrarli seed senaryosunda veri cogalmasini test et.
- [ ] Musavir/personel/mukellef rollerinde veri erisim kapsamlarini manuel test et.
- [ ] Storage upload/read/delete yetkilerini belge ve rapor PDF akislariyla test et.
- [ ] Audit log kayitlarinin gercek Firestore'da olustugunu dogrula.

Kabul kriteri:

- Musavir tum portfoy verilerini gorur.
- Personel yetkili oldugu operasyonlari yapar.
- Mukellef sadece kendi firma/verilerini gorur.
- Belge ve rapor linkleri gercek Storage uzerinden acilir.
- Kritik aksiyonlar audit log'a duser.

## P1 - MVP Is Akislarini Tamamlama

- [ ] Musteri ekleme/duzenleme/pasife alma akisini gercek Firebase ile test edip kenar durumlari kapat.
- [ ] Musteri detay sayfasinda beyanname, tahsilat, belge, rapor ve risk ozetini tek tutarli akisa bagla.
- [ ] Gorev olusturma/duzenleme/silme/durum degistirme/not ekleme akislarini Firebase rules ile test et.
- [ ] Otomatik gorev onerilerini kullaniciya onaylatan veya toplu olusturan arayuz ekle.
- [ ] Belge talep/onay akisi ekle: talep edildi, yuklendi, inceleniyor, onaylandi, reddedildi.
- [ ] Tahsilat parcali odeme modelini detaylandir: odeme kalemleri, odeme tarihi, yontem, makbuz referansi.
- [ ] Tahsilat toplu liste/filtre ekranini guclendir: geciken, kismi, tamamlanan, musteri bazli.
- [ ] Beyanname donemini aktif mali doneme bagla; mock tarihleri dinamik donem uretimine tasin.
- [ ] Mukellef panelinde belge yukleme ve rapor indirme akisini rol kapsami ile tekrar dogrula.

Kabul kriteri:

- Bir musteri icin bastan sona portfoy yonetimi calisir: belge, gorev, tebligat, beyanname, tahsilat, rapor.
- Demo fallback ile gercek Firebase davranisi arasinda beklenmeyen fark kalmaz.
- CRUD islemleri ekranda aninda ve kalici olarak gorunur.

## P2 - Muhasebe Domain Mantigi

- [ ] KDV2 hesaplamasini hizmet/fatura tiplerine gore oran secen domain servisine tasir.
- [ ] KDV2 icin oran tablosu, istisna durumlari ve manuel oran override kontrolu ekle.
- [ ] KDV2 hesaplama testleri ekle: matrah, oran, tevkifat, odeme tutari, yuvarlama.
- [ ] Risk sinyali modeli ekle: kaynak, seviye, aciklama, olusma tarihi, iliskili kayit.
- [ ] Risk gecmisi modeli ekle ve musteri detayinda zaman cizgisi olarak goster.
- [ ] Risk merkezinden aksiyon baslat: gorev olustur, mesaj gonder, tebligata git, belge talep et.
- [ ] Rapor sablonlarini tanimlanabilir hale getir: aylik ozet, risk raporu, tahsilat raporu, beyanname raporu.
- [ ] Rapor uretimini arka plan job/queue mantigina hazirla.

Kabul kriteri:

- KDV2 hesaplari aciklanabilir ve test edilebilir hale gelir.
- Risk skoru yalnizca sayi degil, gerekce ve aksiyonla birlikte sunulur.
- Raporlar sablon secimiyle uretilebilir.

## P2 - Admin, Yetki ve Guvenlik

- [ ] Kullanici davet etme akisi ekle.
- [ ] Rol yonetimi ekle: musavir, personel, mukellef, pasif.
- [ ] Mukellef-kullanici eslestirme ekranini tamamla.
- [ ] Firestore rules dosyasini production icin sertlestir; bootstrap davranisini admin kontrollu hale getir.
- [ ] VKN/TCKN, finansal tutarlar ve hassas tebligat verileri icin maskeleme/yetki kontrolleri ekle.
- [ ] Kritik aksiyonlarda audit log'un istemci tarafinda manipule edilememesi icin backend/Cloud Functions stratejisi degerlendir.
- [ ] Ayarlar ekranindaki bildirim tercihlerini kalici kaydet.
- [ ] Sifre degistirme, sifre sifirlama ve hesap pasife alma akislarini tamamla.
- [ ] Firebase App Check ve oran siniri ihtiyacini degerlendir.

Kabul kriteri:

- Kullanici/rol degisiklikleri kontrollu ve izlenebilir olur.
- Mukellef verisi baska mukellef veya yetkisiz personel tarafindan okunamaz.
- Hassas veriler rollere gore maskelenir.

## P3 - Gercek Entegrasyonlar

- [ ] WhatsApp Business provider secimi yap: Meta Cloud API veya araci servis.
- [ ] WhatsApp credential, template id, provider response ve hata modelini ekle.
- [ ] WhatsApp retry, teslim/okundu status ve webhook akislarini ekle.
- [ ] GIB adapter arayuzu ekle: tebligat, beyanname durumu, PDF referansi, sync sonucu.
- [ ] Luca adapter arayuzu ekle: musteri listesi, finansal ozet, muhasebe/fatura kayitlari.
- [ ] Entegrasyon ayarlarindaki "Yapilandir" butonlarini credential akisi haline getir.
- [ ] Sync log modeli ekle: kaynak sistem, baslama, bitis, sonuc, hata, islenen kayit sayisi.
- [ ] Queue/worker soyutlamasi ekle: rapor uretimi, WhatsApp, GIB/Luca sync, risk skorlama.

Kabul kriteri:

- Entegrasyonlar mock buton olmaktan cikar ve izlenebilir sync akisina sahip olur.
- Basarisiz gonderim/sync denemeleri kullaniciya gerekcesiyle gorunur.
- Retry ve webhook ile dis sistem durumlari takip edilir.

## P4 - Test, CI ve Operasyon

- [ ] Unit test ekle: risk hesabi, KDV2 hesabi, tarih/donem hesaplari, format util fonksiyonlari.
- [ ] Repository/hook seviyesinde Firebase mock testleri ekle.
- [ ] E2E smoke test ekle: login, musteri CRUD, gorev CRUD, belge upload, rapor PDF, mukellef paneli.
- [ ] CI akisi kur: install, lint, typecheck/build, unit test, e2e smoke.
- [ ] `npm audit` bulgularini incele ve kritik/yuksek riskleri kapat.
- [ ] Next.js ve bagimliliklari guvenli surume yukselt.
- [ ] Staging/production ortam ayrimini netlestir.
- [ ] Deploy dokumani ekle: env, Firebase rules, Storage rules, seed, build, rollback.
- [ ] Hata izleme/loglama ekle: istemci hatalari, Firebase hatalari, entegrasyon hatalari.
- [ ] Backup/restore ve veri geri alma stratejisi yaz.

Kabul kriteri:

- Yeni degisiklikler CI'da otomatik kontrol edilir.
- Yayina cikis ve geri alma adimlari yazilidir.
- Kritik kullanici akislarinda en az bir E2E smoke testi vardir.

## P5 - UX ve Urun Derinligi

- [ ] Global arama sonuclarini kategori, musteri, tarih ve durumla zenginlestir.
- [ ] Bildirim merkezini gercek olaylara bagla: belge yuklendi, tahsilat gecikti, tebligat geldi, rapor hazir.
- [ ] Tum tablolarda tutarli filtre, siralama ve bos durum tasarimi kullan.
- [ ] Klavye gezintisi, focus state, aria label ve kontrast kontrollerini tamamla.
- [ ] Kullaniciya net hata mesajlari ver: Firebase yetki hatasi, upload hatasi, gonderim hatasi, validation hatasi.
- [ ] Dashboard'u role gore ozellestir: musavir portfoy, personel gorev, mukellef kendi durum ozeti.
- [ ] Musteri detayinda zaman cizgisi ekle: tebligat, belge, gorev, tahsilat, rapor, audit.
- [ ] Rapor ve belge goruntulemede preview/indirme/yeniden olusturma aksiyonlarini netlestir.

Kabul kriteri:

- Uygulama yalnizca calisan degil, gunluk kullanimda hizli ve anlasilir hale gelir.
- Bos/hata/yukleme durumlari kullaniciyi belirsizlikte birakmaz.

## Onerilen Uygulama Sirasi

1. P0 smoke ve statik asset stabilizasyonunu tamamla.
2. Gercek Firebase ortamiyla auth/rules/storage/seed dogrula.
3. Musteri, gorev, belge, tahsilat ve rapor MVP akislarini uc uca kapat.
4. Belge talep/onay ve otomatik gorev onay akislarini ekle.
5. KDV2 domain servisi ve testlerini ekle.
6. Risk gecmisi ve riskten aksiyon baslatma akislarini ekle.
7. Admin/rol yonetimi ve rules sertlestirmeyi tamamla.
8. WhatsApp provider entegrasyonu ve webhook/retry akislarini ekle.
9. GIB/Luca adapter iskeleti ve sync loglarini ekle.
10. Test/CI/deploy/monitoring islerini tamamla.

## Ilk Sonraki Teknik Adimlar

- [ ] `npm run dev:clean` ile temiz dev server ac ve ana rotalari kontrol et.
- [ ] `npm run build` calistir; ardindan dev server gerekiyorsa `.next` temizlenerek yeniden baslat.
- [ ] Firebase proje bilgileri hazirlaninca P1 smoke senaryosunu tek tek isaretle.
- [ ] KDV2 domain servisi icin test dosyasi ve oran tablosu taslagini ekle.
- [ ] Role dayali admin/kullanici yonetimi ekraninin veri modelini netlestir.
