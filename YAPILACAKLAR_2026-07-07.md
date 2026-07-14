# MusavirERP — Yapılacaklar Listesi
**Tarih:** 2026-07-07  
**Kaynak:** Müşavir geri bildirimi — kapsamlı geliştirme talebi

---

## Öncelik Kılavuzu

| Sembol | Anlam |
|--------|-------|
| 🔴 | Bug / Kırık özellik — acil düzeltme |
| 🟡 | Önemli eksiklik — kısa vadeli |
| 🟢 | Yeni özellik — orta vadeli |
| 🔵 | Büyük modül — uzun vadeli / faz-2 |

---

## 1. Müşteri Kartı Genişletme 🟡

Müşteri detay sayfasında tüm kritik bilgiler tek ekrandan erişilebilir olmalı.

### 1.1 Portal & Sistem Erişim Bilgileri
- [ ] **GİB/e-Devlet portal kullanıcı kodu + şifre** alanı (mevcut GİB şifresiyle aynı AES-256-GCM şifreleme mantığı)
- [ ] **SGK kullanıcı kodu + şifre** alanı (aynı şifreleme, şifreler asla düz metin saklanmaz)
- [ ] **e-Devlet şifresi** alanı (opsiyonel, şifreli saklama)
- [ ] Kurum bilgileri kartı içinde: **Vergi dairesi adı + vergi dairesi kodu**
- [ ] Kurum bilgileri kartı içinde: **SGK işyeri sicil numarası**
- [ ] Tüm şifreli alanlar için göster/gizle toggle (göz ikonu), kopyala butonu

### 1.2 NACE Kodu Yönetimi
- [ ] **NACE kodu arama/seçme** — mevcut boş dropdown sorunu düzeltilecek; NACE listesi `lib/data/nace.ts` dosyasına eklenecek, arama destekli select
- [ ] **Birden fazla NACE kodu** ekleyebilme (liste yapısı)
- [ ] **Ana faaliyet kodu** işaretleme (her NACE girişinin yanında "Ana faaliyet" checkbox'ı)
- [ ] Müşteri listesinde NACE kodu sütunu (opsiyonel göster/gizle)

### 1.3 Ortak / Yönetici Bilgileri
- [ ] Müşteri kartına **Ortaklar** bölümü (liste):
  - Ad, Soyad
  - T.C. Kimlik No (maskeli gösterim)
  - Doğum tarihi
  - Kimlik seri/no (opsiyonel)
  - e-Devlet şifresi (şifreli, opsiyonel)
  - Hisse adedi / hisse oranı (%)
  - Sermaye tutarı (₺)
- [ ] Ortak ekle / düzenle / sil işlemleri (modal)
- [ ] Ortak listesi müşteri detay sayfasında tab veya accordion olarak gösterilecek

### 1.4 Vergisel İstisnalar & Özel Durumlar
- [ ] **İstisna/teşvik etiketleri** müşteri kartında (çoklu seçim):
  - `genç_girişimci` — Gelir Vergisi Kanunu md. 20/A istisnası
  - `yazılım_istisnası` — KVK md. 5/1-a yazılım satışı istisnası
  - `teknokent_istisnası` — 4691 sayılı Kanun kapsamı
  - `ar_ge_teşviği` — Ar-Ge indirim/teşviği
  - `ihracat_teşviği`
  - `diğer` (serbest metin)
- [ ] İstisna etiketi olan mükellefler için beyanname ve geçici vergi ekranlarında **sarı uyarı rozeti** ("Bu mükellef genç girişimci istisnasından yararlanıyor — beyanname hazırlanırken dikkat!")
- [ ] Müşteri listesinde istisna filtresi

### 1.5 MuhtasarSGK Periyot Ayrımı
- [ ] Mükellef vergi türleri bölümünde `muhtasar_sgk` seçeneği **Aylık / 3 Aylık** olarak ikiye ayrılacak:
  - `muhtas_sgk_aylik`
  - `muhtas_sgk_3aylik`
- [ ] Bu ayrım beyanname oluşturma ve takvim hesaplamasına yansıyacak

---

## 2. E-Defter Takip Modülü 🟡

### 2.1 Mükellef Kaydında E-Defter Ayrımı
- [ ] Mükellef ekleme/düzenleme formunda `e_deftere_tabi` seçeneği genişletilecek:
  - `hayir`
  - `evet_aylik`
  - `evet_3aylik`
- [ ] Bu alan `Musteri` tipine eklenmeli: `eDeftere_tabi: "hayir" | "evet_aylik" | "evet_3aylik"`

### 2.2 E-Defter Gönderim Takip Tablosu
- [ ] Yeni sayfa: `/edefter` (sol menüye eklenmeli)
- [ ] Tablo sütunları:
  - Firma adı
  - Periyot türü (Aylık / 3 Aylık)
  - Dönem (YYYY-MM)
  - Gönderim durumu (Gönderildi / Gönderilmedi / Gecikti)
  - Gönderim tarihi
  - Not / aksiyon
- [ ] Dönem filtreleme (ay/yıl seçici)
- [ ] Toplu durum güncelleme (birden fazla firma seçip "Gönderildi" işaretleme)
- [ ] Veri kaynağı: `eDeftere_tabi` = "evet_*" olan tüm aktif müşteriler otomatik listelenir

### 2.3 E-Defter Uyarıları
- [ ] **Aylık gönderim hatırlatması**: Her ayın son 5 günü → `evet_aylik` olan mükelleflerin sayısı dashboard'da uyarı olarak gösterilecek
- [ ] **3 Aylık gönderim hatırlatması**: Her çeyrek son 5 günü (Mart, Haziran, Eylül, Aralık) → `evet_3aylik` mükellefleri için uyarı
- [ ] Takvimde e-defter gönderim tarihleri mor değil **yeşil** renkte gösterilecek (vergi tarihlerinden ayrıştırma)
- [ ] `instrumentation.ts` cron'una e-defter hatırlatma işi eklenmeli (`EDEFTER_HATIRLATMA_SCHEDULE`, vars. her ayın 26. günü 08:00)

---

## 3. Teknokent Proje Takip Modülü 🟢

### 3.1 Mükellef Kartında Teknokent Bilgisi
- [ ] Mükellef formuna **Teknokent mükellefiyeti** alanı:
  - Teknokent adı (serbest metin veya liste: TÜBİTAK, ITÜ Arı, ODTÜ Teknokent vb.)
  - Teknokent başlangıç tarihi

### 3.2 Proje Takip Sayfası
- [ ] Yeni sayfa: `/teknokent` veya müşteri detayı içinde sekme
- [ ] **Proje kaydı** alanları:
  - Proje adı
  - Proje kodu
  - Bağlı olduğu teknokent
  - Başlangıç tarihi / Bitiş tarihi (tahmini)
  - Durum: `aktif` | `tamamlandı` | `askıda`
  - Açıklama / notlar
- [ ] Proje listesi: hangi proje hangi teknokentte, ne zaman bitiyor — tarihe göre sıralı
- [ ] Yaklaşan bitiş tarihi (30 gün içinde) için dashboard uyarısı

### 3.3 Faz-2 için altyapı hazırlığı (şimdi stub olarak ekle)
- [ ] Proje bazlı aylık **gider takibi** (STUB — faz-2)
- [ ] Proje bazlı aylık **gelir takibi** (STUB — faz-2)
- [ ] Personel saat girişi (STUB — faz-2)
- [ ] Vergisel avantaj raporlaması (STUB — faz-2)

---

## 4. POS / Z Raporu Takip Modülü 🟢

### 4.1 Mükellef Kartında POS Bilgisi
- [ ] Mükellef formuna **POS türü** alanı (çoklu seçim):
  - `fiziksel_pos` — Geleneksel POS cihazı (Z raporu gerektirir)
  - `sanal_pos` — Online satış / sanal POS
  - `yok`

### 4.2 POS / Z Raporu Takip Tablosu
- [ ] Beyanname takip sayfasında yeni sekme **"POS / Z Raporu"** veya ayrı sayfa `/pos-takip`
- [ ] Tablo: Her ay için fiziksel POS'u olan mükelleflerin Z raporu teslim durumu
  - Firma adı · POS türü · Dönem · Z raporu teslim durumu · Kredi kartı satışları girildi mi · Not
- [ ] Sanal POS'u olanlar için "KK satışları yazıldı mı" sütunu
- [ ] Teslim edilmeyenler için renk uyarısı (kırmızı)
- [ ] Dashboard'da "Z raporu eksik: X firma" uyarı kartı (fiziksel POS'lu mükellef sayısına göre)

---

## 5. Beyanname Takip Ekranı — Bug Düzeltmeleri 🔴

### 5.1 Tablo Taşma Sorunu
- [ ] **Sabit not sütunu genişliği** ayarlanmalı — uzun notlar `line-clamp-2` ile kesilecek, hover'da tooltip ile tam metin gösterilecek
- [ ] Tablo yatay scroll düzgün çalışmalı: `overflow-x: auto` wrapper eklenecek, tüm sütunlar `min-w-[Xpx]` ile minimum genişlik alacak
- [ ] **Ay sütunu yapışkan (sticky)** — sol tarafta `sticky left-0 bg-white z-10` ile sabitlenerek sağa kaydırmada kaybolmaması sağlanacak
- [ ] Farklı aylardaki not kaymasının kök nedeni araştırılacak (muhtemelen colspan veya tarih bazlı koşullu render)

---

## 6. Tahakkuk — Excel Yükleme Eşleştirme Sorunu 🔴

- [ ] Excel/banka ekstresi yüklendiğinde **firma adı dropdown'ı** populate olmuyor
- [ ] **Tutar alanı** otomatik doldurulmuyor
- [ ] Kök neden: Excel parse sonrası `firmaAdi` ve `tutar` sütun eşleştirmesi yanlış veya eksik — `lib/integrations/banka/` veya ilgili parse kodu incelenmeli
- [ ] **"Eşleştirmeleri Kaydet" butonu aktif olmuyor** — tüm zorunlu alanlar dolsa bile buton disabled kalıyor; form validasyon mantığı gözden geçirilecek

---

## 7. Banka Ekstresi — Eşleştirme Kayıt Sorunu 🔴

- [ ] PDF veya Excel yüklenince parse sonrası **"Eşleştirmeleri Kaydet"** butonu aktif olmuyor
- [ ] Parse edilen satırlar Firestore'a yazılmıyor, o ayki tahsilatlar kaydedilemiyor
- [ ] Test: farklı banka PDF formatları (Akbank, Garanti, İş Bankası) ile denenmeli
- [ ] Hata ayıklama: browser console'da buton disabled olma nedeni belirlenmeli

---

## 8. Takvim — Vergi Tarihleri Eksikliği 🟡

- [ ] `lib/data/vergiTakvimi.ts` dosyasındaki statik veriler eksiksiz mi kontrol edilmeli
- [ ] GİB'ten çekilen dinamik takvim (`/api/vergi-takvimi/sync`) ile statik veriler karşılaştırılmalı
- [ ] Eksik/hatalı vergi tarihleri tespit edilerek statik listeye eklenecek
- [ ] **MuhtasarSGK 3 aylık** beyanname tarihleri takvime yansıyor mu kontrol edilmeli
- [ ] **E-defter gönderim tarihleri** takvime eklenmeli (bkz. §2.3)
- [ ] Takvim olaylarında `tur` alanı genişletilecek: `"edefter"` türü eklenmeli, farklı renk (yeşil)

---

## 9. Mükellef Ekleme — Genel Düzeltmeler 🔴🟡

- [ ] **NACE kodu dropdown boş geliyor** — `lib/data/nace.ts` oluşturulacak, NACE 2008 Türkiye listesi eklenecek, arama destekli select bileşeni kullanılacak (mevcut empty dropdown fix)
- [ ] `muhtasar_sgk` türü aylık / 3 aylık ayrımı (bkz. §1.5)
- [ ] `e_deftere_tabi` alanı aylık / 3 aylık genişletmesi (bkz. §2.1)
- [ ] Teknokent mükellefi işaretleme alanı (bkz. §3.1)
- [ ] POS türü alanı (bkz. §4.1)
- [ ] İstisna etiketleri (bkz. §1.4)
- [ ] Ortaklar bölümü (bkz. §1.3)

---

## 10. Kurum Bilgileri Genişletme 🟡

Müşteri detay "Kurum Bilgileri" kartı:

- [ ] Vergi dairesi adı
- [ ] Vergi dairesi kodu
- [ ] SGK işyeri sicil numarası
- [ ] SGK kullanıcı kodu (şifreli)
- [ ] SGK şifresi (şifreli)
- [ ] GİB portal kullanıcı kodu (mevcut GİB entegrasyonuyla birleştirilecek)
- [ ] e-Devlet şifresi (şifreli, opsiyonel)
- [ ] Tüm şifreli alanlar tek bir `encryptedCredentials` map'i altında; şifreleme `lib/integrations/gib/encrypt.ts` ile

---

## 11. Özet: Veri Modeli Değişiklikleri

Aşağıdaki alanlar `lib/types/index.ts` içindeki `Musteri` tipine eklenecek:

```typescript
// Vergi türleri genişletmesi
eDeftere_tabi: "hayir" | "evet_aylik" | "evet_3aylik";
muhtas_sgk_periyot: "aylik" | "uc_aylik"; // mevcut muhtasar_sgk yerine

// İstisnalar
istisnalar: Array<"genc_girisimci" | "yazilim" | "teknokent" | "arge" | "ihracat" | "diger">;
istisnaNotu: string?;

// Teknokent
teknokentAdi: string?;
teknokentBaslangic: string?; // ISO date

// POS
posTuru: Array<"fiziksel_pos" | "sanal_pos">;

// NACE
nacKodlari: Array<{ kod: string; aciklama: string; anaFaaliyet: boolean }>;

// Kurum erişim bilgileri (şifreli)
encryptedCredentials: {
  gibKullaniciKodu?: string;  // AES-GCM şifreli
  gibSifresi?: string;        // zaten mevcut
  sgkKullaniciKodu?: string;  // AES-GCM şifreli
  sgkSifresi?: string;        // AES-GCM şifreli
  edevletSifresi?: string;    // AES-GCM şifreli
}?;
vergiDairesiAdi: string?;
vergiDairesiKodu: string?;
sgkSicilNo: string?;
```

Yeni koleksiyonlar:

```
ortaklar/         {musteriId, ofisId, ad, soyad, tckn (şifreli), dogumTarihi, hisseOrani, sermaye, ...}
teknokent_projeler/  {musteriId, ofisId, projeAdi, projeKodu, teknokentAdi, baslangic, bitis, durum}
edefter_takip/    {musteriId, ofisId, donem, periyot, durum, gonderimTarihi}
pos_takip/        {musteriId, ofisId, donem, zRaporuDurumu, kkSatislariDurumu}
```

---

## 12. Sıralama Önerisi (Uygulama Sırası)

| Sıra | Madde | Neden Önce |
|------|-------|-----------|
| 1 | §5 Beyanname tablo taşma | Kullanımı doğrudan etkiliyor |
| 2 | §6-7 Tahakkuk/Banka ekstresi bug | Veri kaybına yol açıyor |
| 3 | §9 NACE dropdown fix | Her yeni müşteri eklemede engel |
| 4 | §1.5 + §2.1 MuhSGK / e-Defter ayrımı | Veri modeli temeli — diğerleri buna bağlı |
| 5 | §2.2-2.3 E-Defter takip tablosu + uyarılar | Pratik değer yüksek, hataları önler |
| 6 | §1.1 + §10 Şifreli erişim bilgileri | Güvenlikli yapı hazır, uygulama hızlı |
| 7 | §1.3 Ortaklar modülü | Sık referans verilen bilgi |
| 8 | §1.4 İstisnalar & uyarılar | Vergi hatasını önler |
| 9 | §4 POS / Z raporu takibi | Aylık rutin kontrol |
| 10 | §3 Teknokent proje takibi | Büyük modül, hazırlık gerekli |
| 11 | §8 Takvim eksiklikleri | Kapsamlı test gerekiyor |

---

---

## 13. Faz-2 Notları (sonraki faz)

- [ ] **Taranmış banka PDF'leri için OCR** 🔵 — Bazı bankalar (ör. Ziraat) ekstreyi tek bir görüntü/taranmış PDF olarak veriyor; metin katmanı yok, `pdfjs.getTextContent()` boş dönüyor. Şu an net uyarı gösteriliyor ("Excel/CSV indirin veya manuel ekleyin"). Faz-2'de Tesseract.js veya bir OCR servisi ile görüntüden metin çıkarma araştırılacak. Kaynak: [bankaEsleme.ts](lib/domain/bankaEsleme.ts) — `parseBankaPdfFile` içindeki görüntü-PDF tespiti.

---

*Son güncelleme: 2026-07-13 — P0 bug düzeltmeleri (banka parse ilk-para-token, sticky sütun opaklığı, sözleşme→belge, alfabetik sıra) uygulandı; OCR faz-2'ye alındı.*

---

## 14. Uygulama Günlüğü — 2026-07-13 (2. oturum)

**Bu oturumda tamamlanan modüller** (tsc temiz · `npm run build` başarılı · 153/153 test geçti):

- ✅ **§2 E-Defter Takip modülü** — yeni sayfa `/edefter` (sol menüde), `edefterTakip` koleksiyonu + repo (`createEDefterTakip`/`updateEDefterTakip`/`deleteEDefterTakip`), Firestore rules, dönem seçici, toplu "gönderildi" işaretleme, geçmiş dönem → görsel "gecikti". 3 aylık mükellefler yalnızca çeyrek sonu aylarında listelenir. Veri kaynağı: `eDefter` alanı "yuklu_aylik/yuklu_3aylik/yuklu".
- ✅ **§4 POS / Z Raporu modülü** — yeni sayfa `/pos-takip`, `posTakip` koleksiyonu + repo, rules. Fiziksel POS → Z raporu, sanal POS → KK satışları takibi (tıklayarak toggle). Mükellef kartına **POS Türü** çoklu seçim eklendi (`posTuru`).
- ✅ **§3 Teknokent Proje Takip modülü** — yeni sayfa `/teknokent`, `teknokentProjeler` koleksiyonu + repo, rules. Proje ekle/düzenle/sil (modal), bitişe göre sıralı, 30 gün uyarısı. Mükellef kartına **Teknokent Mükellefiyeti** (`teknokentMukellef`/`teknokentAdi`/`teknokentBaslangic`) eklendi.
- ✅ **§1.4 Vergisel İstisnalar** — `Musteri.istisnalar` + `istisnaNotu`, mükellef kartında çoklu-seçim etiket UI, `IstisnaBadge` bileşeni (sarı uyarı rozeti) beyannameler listesinde + müşteri detay başlığında gösteriliyor.
- ✅ **§2.3 + §4 Dashboard uyarıları** — ay sonu (son 5 gün) aylık e-defter, çeyrek sonu 3 aylık e-defter, ve fiziksel POS Z raporu hatırlatma banner'ları (ilgili sayfaya link).

**Veri modeli:** `lib/types/index.ts`'e `EDefterTakip`, `PosTakip`, `TeknokentProje` interface'leri + `MusteriIstisna`/`PosTuru`/`ISTISNA_ETIKETLERI`/`POS_TURU_ETIKETLERI` eklendi. `COLLECTIONS`'a 3 yeni koleksiyon. `AuditEntityType`'a `edefter`/`pos_takip`/`teknokent`.

---

## 15. Uygulama Günlüğü — 2026-07-13 (3. oturum, kalanların tamamlanması)

**Bu oturumda tamamlanan** (tsc temiz · `npm run build` başarılı · 153/153 test geçti):

- ✅ **§8 + §2.3 kalan — Takvim & e-defter cron**
  - `vergiTakvimi.ts`: `edefter` kategorisi eklendi; e-Defter berat olayları artık `kategori:"edefter"`. **3 aylık e-Defter berat** (Q1→Tem, Q2→Eki, Q3→Oca, Q4→Nis sonu) ve **Muhtasar (MUHSGK) 3 aylık** (Q→izleyen ayın 26'sı) tarihleri eklendi.
  - `MiniTakvim.tsx`: `tur:"edefter"` + BookText ikonu + **yeşil (emerald) lejant**; dashboard e-defter olaylarını başlıktan tespit edip yeşil renklendiriyor (vergi = mor).
  - **E-Defter hatırlatma cron'u**: `lib/jobs/edefter-hatirlatma.ts` + `app/api/cron/edefter-hatirlatma/route.ts` + `instrumentation.ts`'e `EDEFTER_HATIRLATMA_SCHEDULE` (vars. `0 8 26 * *`). Müşavire bildirim + WhatsApp özeti (müvekkile gitmez), aylık idempotent.
- ✅ **§1.2 Çoklu NACE + ana faaliyet** — `Musteri.nacKodlari: {kod,aciklama,anaFaaliyet}[]`; mükellef kartında ekle/kaldır/ana-faaliyet-radyo arayüzü; `naceKodu` ana faaliyetten türetilerek geriye dönük uyumlu tutuluyor.
- ✅ **§1.3 Ortaklar modülü** — `Ortak` tipi + `ortaklar` koleksiyonu + repo (`createOrtak`/`updateOrtak`/`deleteOrtak`) + Firestore rules (personel erişimi, kişisel veri). Müşteri detayında **"Ortaklar" sekmesi** (tablo + mobil kart + ekle/düzenle/sil). [OrtakModal](components/modals/OrtakModal.tsx): ad, soyad, TCKN (maskeli gösterim), doğum tarihi, kimlik seri/no, **e-Devlet şifresi (AES-256-GCM şifreli)**, hisse adedi/oranı, sermaye.
- ✅ **Auth çekirdeği doğrulandı (sabit)** — giriş / kayıt / şifremi-unuttum tek sayfada (`authMode`), `AuthContext` Firebase'e doğru bağlı (`signInWithEmailAndPassword`/`createUserWithEmailAndPassword`/`sendPasswordResetEmail`/`signOut`), müşavir kaydında ofis dokümanı + davet akışı + demo fallback korunmuş. Değişiklik gerekmedi.

**Artık YAPILAN toplam kapsam:** §1.1, §1.2, §1.3, §1.4, §1.5, §2 (tümü), §3 (2.1/2.2 + stub §3.3 hariç), §4, §5, §6, §7, §8, §9, §10.

**Bilinçli kapsam dışı / sonraki batch:**
- ⬜ **§3.3 Teknokent faz-2 stub'ları** — proje bazlı gider/gelir/personel-saat/vergi-avantaj raporlaması (to-do'da "STUB — faz-2" işaretli)
- ⬜ **§6/§7 canlı UI testi** — banka/excel "Eşleştirmeleri Kaydet" akışının gerçek Firebase + giriş ile tarayıcı testi (kod hazır; kimlik bilgisi gerektirir)
- ⬜ **Firebase config** — takvim `tur` alanı `vergiTakvimi` dinamik senkronunda da e-defter ayrımını taşımak istenirse `/api/vergi-takvimi/sync` çıktısına kategori eklenebilir (şu an dashboard başlık-tespitiyle çözülüyor)

> ⚠️ **Deploy notu:** `firestore.rules` bu oturumda `ortaklar` dahil 4 yeni koleksiyon için güncellendi — `firebase deploy --only firestore:rules` gerekir. Yeni cron `EDEFTER_HATIRLATMA_SCHEDULE` opsiyonel env ile ayarlanabilir (varsayılan her ayın 26'sı 08:00).
