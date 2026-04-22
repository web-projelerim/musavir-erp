# MusavirERP - Guncel To-Do Listesi

Tarih: 2026-04-22

Bu liste mevcut Next.js arayuzu, son eklenen Firebase Auth/Firestore katmani ve aktif ekranlar baz alinarak hazirlandi. Amac, demo/mock hissini azaltip urunu gercek kullanima tasimak.

## Mevcut Zemin

- Giris, dashboard, musteriler, musteri detay, gorevler, tebligatlar, raporlar, risk, KDV2, ayarlar ve mukellef paneli ekranlari var.
- Firebase Auth ve Firestore katmani eklendi; ortam degiskenleri yoksa uygulama demo fallback ile calisiyor.
- Musteri, gorev, rapor, tebligat, beyanname, tahsilat, KDV2, bildirim ve gonderim kayitlari icin Firestore repository fonksiyonlari var.
- Rol bazli arayuz korumasi eklendi: musavir/personel ve mukellef panelleri ayrildi.
- WhatsApp gonderimi artik local provider arayuzunden donen sonuca gore loglaniyor; gercek provider henuz bagli degil.
- Build son kontrolde basariliydi.

## P0 - Gercek Firebase Ortamini Dogrula

- [ ] `.env.local` dosyasina gercek Firebase web app bilgilerini gir.
- [ ] Firebase Authentication icinde musavir, personel ve mukellef test kullanicilarini olustur.
- [ ] Auth kullanicilari icin `kullanicilar/{uid}` dokumanlarini rol, adSoyad, eposta ve gerekiyorsa `musteriId` ile eslestir.
- [ ] `firestore.rules` ve `storage.rules` dosyalarini Firebase projesine deploy et.
- [ ] Ayarlar ekranindan demo veriyi Firestore'a aktar ve tekrarli seed calismasinda veri cogalmasini kontrol et.
- [ ] Gercek Firebase ile su smoke akisini dogrula: giris, musteri ekleme, musteri duzenleme, gorev olusturma, gorev durum guncelleme, beyanname/tahsilat durum guncelleme, rapor olusturma, WhatsApp gonderim logu.
- [ ] Demo fallback modunda calisan ekranlarin gercek Firebase modunda da ayni davranisi verdigini karsilastir.

## P1 - MVP Fonksiyonlarini Tamamla

- [x] Rapor indirme/print-to-PDF akisi ekle: rapor verilerinden yazdirilabilir rapor penceresi uretiliyor.
- [x] Raporu kalici PDF dosyasi olarak uret, Storage'a yaz ve mukellef panelinde goruntule.
- [x] Firebase Storage veya secilecek dosya servisi ile belge yukleme/goruntuleme modulu ekle.
- [x] Musteri detayina belge/dosya sekmesi ekle.
- [x] Tebligat PDF goruntuleme butonunu gercek dosya veya URL referansina bagla.
- [x] Tebligat detay modalini ekle.
- [x] Gorev notlarini kalici hale getir.
- [x] Gorev duzenleme, iptal ve silme aksiyonlarini ekle.
- [x] Kanban uzerinde surukle-birak ile gorev durum degistirme ekle.
- [x] Otomatik gorev kurallarini ekle: yaklasan beyan, yeni tebligat ve geciken tahsilat sinyallerinden gorev uret.
- [x] Eksik belge talepleri icin otomatik gorev/hatirlatma kuralini ekle.
- [x] Tahsilat olusturma formu ekle.
- [x] Kismi odeme, tahsilat tutari, kalan bakiye ve vade guncelleme akislarini tamamla.
- [x] Dashboard grafiklerini sabit diziler yerine beyan, tahsilat ve rapor kayitlarindan uret.
- [ ] Mock tarihleri aktif doneme veya secilebilir mali doneme bagla.
- [ ] Loading, error ve empty state davranislarini tum veri ceken ekranlarda standartlastir.

## P2 - Muhasebe Domain Mantigini Guclendir

- [x] Risk skoru hesaplamasini tek bir domain servisine tasi.
- [x] Musterideki statik `riskSkoru`/`riskSeviyesi` alanlarini sinyal bazli hesaplanan sonuc ile degistir.
- [ ] Risk sinyali ve risk gecmisi modeli ekle.
- [ ] Risk merkezinden aksiyon baslat: gorev olustur, mesaj gonder, ilgili tebligata git.
- [ ] KDV2 hizmet/fatura tiplerine gore tevkifat orani secimi ekle.
- [x] KDV2 kayitlari icin duzenleme, silme ve denetim izi ekle.
- [ ] Rapor sablonlarini tanimlanabilir hale getir.
- [ ] Rapor olusturma surecini arka plan job mantigina hazirla.

## P3 - Gercek Entegrasyonlar

- [ ] WhatsApp Business provider baglantisini ekle: credential, template id, provider response, retry ve webhook.
- [ ] WhatsApp gonderimlerinde basarisiz denemeler icin yeniden deneme ve hata nedeni gosterimi ekle.
- [ ] GIB adapter arayuzunu olustur: tebligat, beyanname durumu, PDF referansi, sync sonucu.
- [ ] Luca adapter arayuzunu olustur: musteri listesi, finansal ozet, muhasebe/fatura kayitlari.
- [ ] Entegrasyon ayarlarindaki "Yapilandir" butonlarini gercek credential akisi haline getir.
- [ ] Sync loglari ekle: baslama zamani, bitis zamani, sonuc, hata, kaynak sistem.
- [ ] Queue/worker soyutlamasi ekle: rapor uretimi, WhatsApp, GIB/Luca sync, risk skorlama.

## P4 - Guvenlik ve Admin

- [ ] Firestore rules dosyasini production icin sertlestir; gecici bootstrap davranisini admin kontrollu hale getir.
- [ ] Kullanici davet etme ve rol yonetimi akislarini ekle.
- [ ] Admin panelinde kullanici aktif/pasif etme, rol degistirme ve mukellef eslestirme ekle.
- [x] Audit log modeli ekle: kim, neyi, ne zaman, once/sonra.
- [ ] VKN/TCKN, finansal tutarlar ve tebligat verileri icin maskeleme/yetki kurallari ekle.
- [ ] Firebase App Check degerlendir.
- [ ] Kritik aksiyonlar icin oran siniri veya tekrar deneme korumasi ekle.
- [ ] Bildirim tercihlerini ayarlar ekranindan kalici kaydet.
- [ ] Ayarlar ekranindaki sifre degistirme akisini tamamla.

## P5 - Kalite, Operasyon ve Yayina Hazirlik

- [ ] Next.js surumunu guvenlik uyarilari nedeniyle guncelle.
- [ ] `npm audit` bulgularini incele ve kritik/yuksek riskleri kapat.
- [ ] Unit test ekle: risk hesabi, KDV2 hesabi, filtreleme, format util fonksiyonlari.
- [ ] E2E smoke test ekle: login, musteri CRUD, gorev CRUD, rapor, mukellef paneli.
- [ ] Build/lint/test CI akisi kur.
- [ ] Responsive kontrolleri tamamla; sidebar mobilde drawer davranisina gecsin.
- [ ] Erisilebilirlik kontrolu yap: focus state, klavye gezintisi, aria label, kontrast.
- [ ] Staging ve production ortam ayrimini netlestir.
- [ ] Deploy dokumani ekle: Firebase, env, build, seed, rules, geri alma adimlari.

## Onerilen Sprint Sirasi

1. Gercek Firebase ortam kurulumu ve smoke test.
2. PDF rapor uretimi ve Storage tabanli belge modulu.
3. Gorev notlari, gorev duzenleme/silme ve tahsilat formu.
4. Dashboard grafiklerinin gercek veriye baglanmasi.
5. Risk domain servisi ve riskten aksiyona gecis.
6. WhatsApp Business gercek provider entegrasyonu.
7. GIB/Luca adapter iskeleti ve sync loglari.
8. Audit log, admin rol yonetimi ve rules sertlestirme.
9. Testler, CI, dependency guvenlik guncellemeleri.
10. Responsive/UX son kontroller ve yayina hazirlik.

## MVP Kabul Kriterleri

- [ ] Musavir/personel gercek Firebase Auth hesabi ile giris yapabiliyor.
- [ ] Mukellef sadece kendi firmasinin verilerini goruyor.
- [ ] Musteri ekleme, duzenleme, pasife alma ve detay goruntuleme kalici calisiyor.
- [ ] Gorev olusturma, durum guncelleme ve not ekleme kalici calisiyor.
- [ ] Tebligat ve beyanname durumlari kalici guncelleniyor.
- [ ] Tahsilat olusturma, odeme kaydetme ve kismi odeme calisiyor.
- [x] Risk skoru tek domain servisinden hesaplanip gerekcesiyle gosteriliyor.
- [x] KDV2 hesaplama kaydediliyor, musteriyle iliskileniyor ve duzenlenebiliyor.
- [x] Rapor PDF olarak uretiliyor, indiriliyor ve gonderim durumu takip ediliyor.
- [ ] WhatsApp/e-posta gonderim denemeleri loglaniyor.
- [x] Belge yukleme/goruntuleme hem musavir hem mukellef tarafinda calisiyor.
- [x] Audit log ve temel yetki kontrolleri aktif.
- [ ] Build, unit test ve e2e smoke testleri geciyor.
