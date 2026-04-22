# MusavirERP - Mevcut Arayuz Bazli Fonksiyonel To-Do

Bu liste mevcut GitHub reposu incelenerek hazirlandi ve su anki arayuzun uzerine neyin islevsel olarak eklenmesi gerektigini gosterir.

## Mevcut Durum Ozeti

- Next.js 14, TypeScript, Tailwind CSS, lucide-react ve recharts kullaniliyor.
- Giris, musavir panel layout'u, dashboard, musteriler, musteri detay, gorevler, raporlar, tebligat/beyan, risk, KDV2, ayarlar ve mukellef paneli ekranlari var.
- Ortak UI component'leri var: Button, Card, Badge, Input, Modal, PageHeader, RiskMetre, Table.
- Musteri, gorev, tebligat, beyanname, rapor, bildirim, tahsilat ve KDV2 tipleri tanimli.
- Veri su anda `lib/data/mock.ts` icindeki mock kayitlardan geliyor; kalici backend/veritabani yok.
- Bircok aksiyon toast, alert veya client-side state ile simule ediliyor.

## P0 - Mock Arayuzu Gercek Uygulamaya Ceviren Temel Eksikler

- [x] Kalici veri katmani ekle: Firebase Auth/Firestore config, seed helper ve environment ayrimi eklendi.
- [x] Backend/API katmani kur: Firebase repository katmani ile musteri, gorev, rapor, tebligat, beyanname, tahsilat, KDV2, bildirim ve kullanici koleksiyonlari baglandi.
- [x] `lib/data/mock.ts` bagimliligini kademeli kaldir: ekranlar `useAppData()` ile Firestore + mock fallback uzerinden besleniyor.
- [x] Gercek kimlik dogrulama ekle: Firebase Auth context, giris, cikis ve session takibi eklendi.
- [x] Rol bazli route korumasi ekle: musavir/personel ve mukellef layout guard'lari eklendi.
- [x] Backend seviyesinde yetki kontrolu ekle: Firestore rules ile rol ve mukellef firma kapsami icin ilk kural seti eklendi.
- [ ] Tum tarihleri guncelle ve dinamik hale getir; mock verideki 2024 tarihleri aktif doneme baglansin.
- [x] Form submit'lerini kalici hale getir: yeni musteri, musteri duzenleme, yeni gorev, KDV2 kaydi, rapor/gonderim, beyanname ve tahsilat durumlari Firestore'a baglandi.
- [ ] API loading/error/empty state durumlarini ekle.

## P1 - Mevcut Ekranlarin Islevsel Tamamlanmasi

### Giris ve Yetki

- [x] `/giris` formunu demo yonlendirme yerine gercek auth endpoint'ine bagla.
- [x] Kullanici rolune gore giris sonrasi yonlendirme yap.
- [x] Sidebar ve TopBar'daki kullanici bilgilerini oturumdan getir.
- [x] Cikis butonunu session sonlandiracak sekilde calistir.
- [x] Sifre unutma ve sifre degistirme akisini tamamla: giris ekraninda Firebase password reset akisi eklendi; ayarlar icindeki sifre degistirme formu sonraki sertlestirmede ele alinacak.

### Dashboard

- [x] Dashboard metriklerini API ozet endpoint'inden al: ekran Firestore + fallback veri hook'u uzerinden hesapliyor.
- [x] Hazir rapor sayisi su an sabit; gercek rapor durumlarindan hesapla.
- [ ] Grafik verilerini sabit listeden cikartip beyan/tahsilat kayitlarindan uret.
- [x] Dashboard aksiyonlari sonrasi ilgili sayilari/listeyi yenile.
- [x] TopBar genel aramasini calistir.

### Musteriler

- [x] Yeni musteri modal'i musteri kaydi olustursun ve listeyi guncellesin.
- [x] Musteri duzenleme, pasife alma/arsivleme ve detay kaydetme akislarini ekle.
- [x] Musteri detay sayfasinda bilinmeyen `id` icin 404/uyari goster.
- [x] Eksik filtreleri ekle: sorumlu personel, tahsilat durumu, yaklasan beyan, son tebligat.
- [ ] Musteri detayina belge/dosya sekmesi ekle.

### Gorevler

- [x] Yeni gorev modal'i kalici gorev olustursun.
- [x] Gorev durum guncellemesi API'ye yazilsin.
- [ ] Gorev notlari kalici hale gelsin.
- [ ] Gorev duzenleme, iptal ve silme aksiyonlari ekle.
- [ ] Kanban'da surukle-birak ile durum degistirme ekle.
- [ ] Otomatik gorev uretim kurallari ekle: yaklasan beyan, yeni tebligat, geciken tahsilat, eksik belge.

### Tebligat ve Beyanname

- [ ] Tebligat PDF goruntuleme butonunu gercek dosya/PDF baglantisina bagla.
- [x] "Islendi olarak isaretle" butonu tebligat durumunu kalici guncellesin.
- [ ] Tebligat detay modal'i ekle.
- [x] Beyanname durum degistirme akisi ekle.
- [ ] Yaklasan ve geciken beyanlar aktif tarihe gore otomatik hesaplansin.

### Raporlar

- [x] "Rapor Olustur" butonunu gercek modal/akisla tamamla: buton artik varsayilan operasyon raporu uretim akisini baslatiyor.
- [x] Hizli rapor uretimi backend job baslatsin: Firestore kaydi ve durum gecisi ile simule job akisi eklendi.
- [ ] PDF uretimi ve gercek indirme ekle.
- [ ] Rapor sablonlari tanimlanabilir olsun.
- [x] Rapor gonderim durumlari kalici takip edilsin.
- [x] Secilen raporlar WhatsApp modal'ina aktarilsin.

### WhatsApp ve Bildirimler

- [ ] WhatsApp modal'indaki random basari mantigini provider sonucuna bagla.
- [x] Gonderim gecmisi veri modeli ve ekrani ekle.
- [x] Sablon degiskenlerini gercek veriyle doldur.
- [x] TopBar bildirimlerinde "tumunu gor" ve okundu isaretleme calissin.
- [ ] Ayarlardaki bildirim toggle'lari kalici tercihlere yazilsin.

### Risk Merkezi

- [ ] Risk skoru hesaplamasini tek domain servisine tasi.
- [ ] `riskSkoru` ve `riskSeviyesi` mock alanlari yerine sinyallerden hesaplanmis sonuc kullan.
- [ ] Risk sinyali kaydi olustur ve risk gecmisi goster.
- [ ] Riskten aksiyona gecis ekle: gorev olustur, mesaj gonder, tebligata git.

### KDV2

- [x] KDV2 kaydetme islemini `alert` yerine kalici kayda bagla.
- [ ] Hizmet/fatura tipine gore tevkifat orani secimi ekle.
- [x] KDV2 hesaplama kaydini musteri detayina bagla.
- [ ] KDV2 kayitlari icin duzenleme/silme ve denetim izi ekle.

### Tahsilat

- [ ] Tahsilat olusturma, odeme kaydetme, kismi odeme ve vade guncelleme ekle: odendi/kismi durum guncelleme var, yeni tahsilat ve vade formu bekliyor.
- [ ] Tahsilat hatirlatmasi WhatsApp/e-posta aksiyonuna baglansin.
- [ ] Dashboard tahsilat grafigi gercek tahsilat kayitlarindan uretilsin.

### Mukellef Paneli

- [x] Mukellef paneli ilk musteriye degil, oturumdaki mukellefin firmasina baglansin.
- [x] Mukellef icin API seviyesinde firma kapsam kontrolu ekle.
- [ ] Mukellef dosya yukleme/goruntuleme akisi ekle.
- [ ] Rapor indirme butonu gercek PDF dosyasini indirsin.
- [ ] Duyurular ve mesajlar kalici veriyle gelsin.

## P2 - Entegrasyon ve Arka Plan Isleri

- [ ] GIB adapter arayuzu olustur: tebligat, beyanname durumu, PDF referansi, senkronizasyon sonucu.
- [ ] Luca adapter arayuzu olustur: musteri listesi, finansal ozet, muhasebe/fatura kayitlari.
- [x] WhatsApp provider arayuzu olustur: local mock adapter eklendi; gercek provider credential sonraki fazda baglanacak.
- [ ] Queue/worker altyapisi kur: rapor uretimi, WhatsApp gonderimi, GIB/Luca sync, risk skorlama.
- [ ] Senkronizasyon loglari ekle.
- [ ] Entegrasyon ayarlarindaki "Yapilandir" butonlarini gercek baglanti/credential akisi haline getir.

## P3 - Guvenlik, Kalite ve UX Sertlestirme

- [ ] Audit log ekle.
- [ ] VKN/TCKN, finansal tutarlar ve tebligat verileri icin maskeleme/yetki kurallari ekle.
- [ ] Form validasyonlarini guclendir.
- [ ] Responsive kontrolleri tamamla; sabit sidebar mobilde drawer'a donsun.
- [ ] Erisilebilirlik kontrolu yap.
- [ ] Unit test ekle: risk hesabi, KDV2 hesabi, filtreleme/siralama, format utils.
- [ ] E2E smoke test ekle.
- [ ] Build/lint CI ekle.

## Onerilen Ilk Sprint

1. Auth, session ve rol bazli route korumasi.
2. Veritabani modeli, migration ve seed verisi.
3. Mock data yerine musteri/gorev API'leri.
4. Yeni musteri ve yeni gorev formlarinin kalici calismasi.
5. Musteri detayinda gorev, beyan, tebligat, rapor ve tahsilat verilerinin API'den gelmesi.
6. Risk hesaplama servisinin tek kaynaga alinmasi.
7. Rapor uretim job'u ve PDF indirme.
8. WhatsApp gonderim loglari.
9. Mukellef panelinin oturumdaki firmaya baglanmasi.
10. Temel smoke testler ve responsive duzeltmeler.

## MVP Kabul Kriterleri

- [ ] Musavir gercek hesapla giris yapabiliyor ve dashboard verileri veritabanindan geliyor.
- [ ] Musteri ekleme/duzenleme/detay goruntuleme kalici calisiyor.
- [ ] Gorev olusturma, durum guncelleme ve not ekleme kalici calisiyor.
- [ ] Tebligat ve beyanname durumlari guncellenebiliyor.
- [ ] Risk skoru tek servis tarafindan hesaplanip aciklanabiliyor.
- [ ] KDV2 hesaplama kaydediliyor ve musteriyle iliskileniyor.
- [ ] Rapor PDF olarak uretilip indirilebiliyor.
- [ ] WhatsApp/e-posta gonderim denemeleri loglaniyor.
- [ ] Mukellef sadece kendi firmasinin verilerini gorebiliyor.
- [ ] Audit log ve temel yetki kontrolleri calisiyor.
- [ ] Smoke testler geciyor.
