# MusavirERP — Claude Proje Rehberi

Bu dosya projeyi Claude ile geliştirirken referans alınacak tek kaynak.  
Her görev öncesinde okunmalı; değiştirilmeden önce ilgili bölüm güncellenmeli.

---

## 1. Proje Özeti

**MusavirERP**, Türk mali müşavirler için SaaS ERP uygulamasıdır.  
Müşavir, müşteri portföyünü yönetir; beyanname, tebligat, tahakkuk, görev ve risk takibini tek ekrandan yapar.

- **Stack:** Next.js 14 App Router · TypeScript · Firebase/Firestore · Tailwind CSS
- **Auth:** Firebase Authentication (+ demo fallback)
- **Storage:** Firebase Storage (belgeler, raporlar)
- **Deploy:** Vercel (varsayılan)

---

## 2. MVP Kapsamı

### ✅ MVP'de olan (tamamlanmış veya tamamlanacak)

| Alan | Durum |
|------|-------|
| Firebase Auth + rol yönlendirme | ✅ Çalışıyor |
| Müşteri CRUD (liste, detay, import) | ✅ Çalışıyor |
| Görev yönetimi (Kanban + tablo) | ✅ Çalışıyor |
| Tebligat takip + aksiyon | ✅ Çalışıyor |
| Beyanname CRUD + workflow | ✅ Çalışıyor |
| Tahakkuk türetme (beyanname'den) | ✅ Çalışıyor |
| Banka ekstresi → tahakkuk eşleştirme | ✅ Çalışıyor |
| Risk skoru hesaplama | ✅ Çalışıyor |
| Davet akışı (müşavir → müşteri) | ✅ Çalışıyor |
| Mükellef self-servis paneli | ✅ Çalışıyor |
| Raporlar (PDF + printable HTML) | ✅ Çalışıyor |
| Audit log | ✅ Çalışıyor |
| GİB şifre şifreleme (AES-256-GCM) | ✅ Çalışıyor |
| GİB IVD sync (HTTP tabanlı) | ✅ Çalışıyor (GİB'in tepkisine bağlı) |
| WhatsApp mesaj gönderimi (Meta Cloud API) | ✅ Çalışıyor |
| Mini takvim (dashboard) | ✅ Çalışıyor |
| ofisId çok-kiracılı filtreleme | 🔴 Kritik eksik — yapılacak |
| KullaniciYetki arayüz kontrolü | 🔴 Kritik eksik — yapılacak |

### 🚫 MVP Dışı (stub kalacak, gelecek faz)

| Alan | Neden Dışarıda |
|------|---------------|
| e-Beyanname GİB'e gerçek dosyalama | GİB resmi API yok; USB imza gerekiyor |
| Luca muhasebe entegrasyonu | API dokümantasyonu kapalı |
| Ödeme gateway (iyzico/Stripe) | Ayrı lisans ve PCI-DSS uyumu gerekiyor |
| Resmi Gazete AI özeti (canlı) | Claude API anahtarı + ek maliyet |
| E-posta SMTP gönderimi | Ayrı SMTP altyapısı; MVP'de WhatsApp öncelikli |
| Zamanlayıcı / cron job | Vercel Cron veya ayrı worker servisi gerekiyor |
| SGK/TEDAŞ API entegrasyonları | Kamu API'si yok |
| Mobil uygulama | Sonraki faz |

> **Kural:** Stub bir fonksiyon `// STUB — MVP dışı: <neden>` yorumuyla işaretlenmeli.
> İleride tamamlanacaksa `// TODO(faz-2): <açıklama>` eklenmeli.

---

## 3. Veri Modeli

Tüm tipler `lib/types/index.ts` içindedir. Aşağıda kritik alanlar özetlenmiştir.

### 3.1 User
```
id            string   Firebase UID
ofisId        string   Hangi ofise ait (çok-kiracılı)
ad / soyad    string
email         string
rol           "musavir" | "personel" | "mukellef"
yetkiler      KullaniciYetki[]   (detay §4)
musteriId     string?  Sadece mukellef rolünde
aktif         boolean
```

### 3.2 Musteri
```
id                 string
ofisId             string   ← Firestore sorgusunda WHERE filtresi
firmaAdi           string
vknTckn            string   (10 veya 11 hane)
yetkiliAd          string
telefon / email    string
durum              "aktif" | "pasif" | "beklemede"
riskSeviyesi       "dusuk" | "orta" | "yuksek" | "kritik"
riskSkoru          number   0–100
sorumluPersonel    string   (kullanıcı id veya ad)
tahsilatDurumu     "odendi" | "bekliyor" | "gecikti" | "kismi"
kdvMukellef        boolean
muhtasarMukellef   boolean
```

### 3.3 Beyanname
```
id                   string
ofisId               string
musteriId            string
musteriAdi           string
tur                  "KDV" | "MUHTAS" | "KURUM" | "GELIR" | "GECICI" | "DIGER"
donem                string   "YYYY-MM"
sonTarih             ISO string
durum                "bekliyor" | "verildi" | "gecikti" | "iptal"
yasamDongusuDurum    BeyannameYasamDongusuDurum  (§3.3a)
sorumlu              string
vergiTutari          number?
tahakkukFisNo        string?
odemeSonTarihi       ISO string?
kaynakSistem         "manual" | "gib" | "luca"
```

#### 3.3a Beyanname Workflow (13 durum)
```
planlandi → evrak_bekliyor → hazirlaniyor → ic_kontrol
→ musavir_onayi → gonderildi → tahakkuk_olustu
→ odeme_bekliyor → kapandi
+ duzeltme_gerekli (herhangi bir noktada)
+ iptal
```

### 3.4 Tebligat
```
id                string
ofisId            string
musteriId         string
vknTckn           string
tarih             ISO string
baslik            string
tur               string   (GİB'ten gelen serbest metin)
durum             "yeni" | "okundu" | "islendi" | "bekliyor"
onemDerecesi      "dusuk" | "orta" | "yuksek" | "kritik"?
aksiyonTipi       string?
aksiyonDurumu     string?
pdfUrl            string?
notlar            string?
```

### 3.5 Gorev
```
id              string
ofisId          string?
musteriId       string
musteriAdi      string
baslik          string
aciklama        string?
atananKisi      string
atayanKisi      string
terminTarihi    ISO string
oncelik         "dusuk" | "normal" | "yuksek" | "kritik"
durum           "beklemede" | "devam" | "tamamlandi" | "iptal"
tip             "beyanname" | "tebligat" | "tahsilat" | "belge" | "kdv2" | "diger"
notlar          GorevNot[]   [{id, icerik, yazan, tarih}]
```

### 3.6 Tahakkuk
```
id                  string
ofisId              string
musteriId           string
tahakkukTuru        "hizmet" | "vergi"
hizmetTuru          "mali_musavirlik" | "beyanname" | "danismanlik" | "diger"?
vergiTuru           "KDV" | "MUHTASAR" | "GECICI_VERGI" | ...?
kaynakBeyannameId   string?   (otomatik türetme için)
otomatikTuretilmis  boolean
tutar               number
odenenTutar         number?
vadeTarihi          ISO string
durum               "taslak" | "bekliyor" | "kismi" | "odendi" | "gecikti" | "iptal"
bildirimDurumu      "beklemede" | "planlandi" | "gonderildi" | "basarisiz" | "kapali"
panelLinki          string?   (mükellef paneli deep link)
```

### 3.7 Risk (hesaplama çıktısı, saklanmaz)
```
musteriId   string
skor        number   0–100
seviye      "dusuk" | "orta" | "yuksek" | "kritik"
sinyaller   RiskSinyali[]
```

### 3.8 AuditLog
```
id           string
actorId      string
actorName    string
actorRole    "musavir" | "personel" | "mukellef" | "system"
action       "create" | "update" | "delete" | "status_change" | "upload" | "send" | ...
entityType   string
entityId     string
entityLabel  string?
summary      string
before       Record<string,unknown>?
after        Record<string,unknown>?
createdAt    ISO string
```

### 3.9 GonderimKaydi
```
id          string
ofisId      string
kanal       "whatsapp" | "email" | "panel"
musteriId   string
musteriAdi  string
sablonId    string?
mesaj       string?
durum       "bekliyor" | "gonderildi" | "basarisiz"
hataMesaji  string?
denemeSayisi number
sentAt      ISO string?
createdAt   ISO string
```

### 3.10 GibSyncLog
```
id                  string
ofisId              string
syncTipi            "tebligat" | "beyanname" | "borc" | "mukellef" | "pdf"
durum               "bekliyor" | "basarili" | "basarisiz"
baslamaTarihi       ISO string
bitisTarihi         ISO string?
islenenKayitSayisi  number
hataMesaji          string?
createdBy           string
```

---

## 4. Yetki Matrisi

### 4.1 Rol Tanımları

| Rol | Açıklama |
|-----|----------|
| `musavir` | Tam yetkili hesap sahibi |
| `personel` | Sınırlı yetkili ofis çalışanı |
| `mukellef` | Sadece kendi verisini gören müşteri |

### 4.2 Sayfa/İşlem Yetki Tablosu

| İşlem | musavir | personel | mukellef |
|-------|---------|----------|---------|
| Dashboard görüntüle | ✅ | ✅ | ❌ |
| Müşteri listesi görüntüle | ✅ | ✅ (`portfoy_okuma`) | ❌ |
| Müşteri oluştur/düzenle | ✅ | ✅ (`musteri_yazma`) | ❌ |
| Müşteri sil/arşivle | ✅ | ❌ | ❌ |
| Beyanname görüntüle | ✅ | ✅ | Sadece kendi |
| Beyanname oluştur/düzenle | ✅ | ✅ | ❌ |
| Beyanname workflow ilerlet | ✅ | ✅ | ❌ |
| Tebligat görüntüle | ✅ | ✅ | Sadece kendi |
| Tebligat durum güncelle | ✅ | ✅ | ❌ |
| Tahakkuk görüntüle | ✅ | ✅ (`tahakkuk_yazma`) | Sadece kendi |
| Tahakkuk oluştur/düzenle | ✅ | ✅ (`tahakkuk_yazma`) | ❌ |
| Görev görüntüle | ✅ | ✅ | ❌ |
| Görev oluştur/düzenle | ✅ | ✅ | ❌ |
| Rapor üret | ✅ | ✅ (`rapor_yonetimi`) | ❌ |
| Rapor indir | ✅ | ✅ | Sadece kendi |
| Belge yükle | ✅ | ✅ (`belge_yonetimi`) | Sadece kendine ait (gorunurluk:mukellef) |
| GİB ayarları | ✅ | ❌ | ❌ |
| Ayarlar/Entegrasyon | ✅ | ❌ | ❌ |
| Kullanıcı davet et | ✅ | ❌ | ❌ |
| Audit log görüntüle | ✅ | ❌ | ❌ |

### 4.3 KullaniciYetki Atamaları (Personel)

```
portfoy_okuma    → Müşteri listesi görüntüleyebilir
musteri_yazma    → Müşteri oluşturabilir/düzenleyebilir
tahakkuk_yazma   → Tahakkuk oluşturabilir/düzenleyebilir
belge_yonetimi   → Belge yükleyebilir/silebilir
gib_okuma        → GİB sync sonuçlarını görüntüleyebilir
rapor_yonetimi   → Rapor üretebilir/gönderebilir
```

### 4.4 Uygulama Kuralları

1. Route guard (`AuthGuard`) rol seviyesinde kontrol ediyor — **mevcut, çalışıyor**.
2. Sayfa içi yetki kontrolü için `hasPermission(user, yetki)` helper'ı **henüz yok — yapılacak**.
3. Firestore güvenlik kuralları (`firestore.rules`) `ofisId` bazlı izolasyonu **enforce etmeli**.
4. `ofisId` filtresi Firestore sorgusunda (`where("ofisId", "==", ofisId)`) uygulanmalı — **henüz yok**.

---

## 5. Claude İçin Değişiklik Protokolü

> **Her kod değişikliğinde bu adımları takip et. Adım atlamak yasak.**

### Adım 1 — Kapsam tanımla
- Hangi dosya(lar) değişecek? Listele.
- Bu dosyaları ve bağımlılıklarını oku (`Read` tool).
- Import edilen/export edilen sembolleri not et.

### Adım 2 — Bağımlılık haritası
Değiştireceğin dosyayı kullanan diğer dosyaları `Grep` ile bul:
```
Grep pattern="importEdilecekSembol" path="."
```
Bu dosyalar değişiklikten etkilenebilir — sonunda kontrol et.

### Adım 3 — Minimal değişiklik
- Sadece gerekli olan satırları değiştir.
- Var olan isimlendirmeyi (fonksiyon adı, tip adı, prop adı) bozma.
- Yeni fonksiyon/bileşen eklerken mevcut pattern'i takip et.
- Stub fonksiyon eklerken `// STUB — MVP dışı: <neden>` yorumu ekle.

### Adım 4 — TypeScript kontrolü
Her değişiklik sonrası mutlaka:
```bash
npx tsc --noEmit
```
Çıktı sıfır hata olmalı. Hata varsa düzelt, tekrar çalıştır.

### Adım 5 — Değişiklik özeti
Değişen her dosya için şunu söyle:
```
Değişen: <dosya yolu>
Ne değişti: <1-2 cümle>
Etkilenen bağımlılar: <varsa liste>
```

### Kırmızı Çizgiler
- ❌ Tip adlarını yeniden adlandırma (ör. `Beyanname` → `Declaration`)
- ❌ `useAppData()` dönüş alanlarını kaldırma veya yeniden adlandırma
- ❌ Firestore koleksiyon adlarını değiştirme (`COLLECTIONS` sabiti)
- ❌ `createId()` prefix'lerini değiştirme (varolan veritabanını bozar)
- ❌ Demo fallback'i kaldırma (Firebase olmadan çalışma desteği kalsın)

---

## 6. GİB / Luca Teknik ve Hukuki Sınırlar

### 6.1 GİB İVD (İnternet Vergi Dairesi)

**Durum:** Kamuya açık resmi API yoktur.

| Konu | Açıklama |
|------|----------|
| Endpoint | `https://ivd.gib.gov.tr/tvd_server/dispatch` (değişebilir) |
| Auth | `assoscmd: "anlogin"` + kullanıcı kodu + şifre |
| Şifre saklama | AES-256-GCM, `GIB_SECRET_KEY` env var ile (`lib/integrations/gib/encrypt.ts`) |
| Plaintext sıfır | Şifreler hiçbir zaman Firestore'a yazılmaz; sadece şifreli blob |
| Hukuki risk | GİB T&C muğlak; müşavir kendi hesabıyla kendi müşterileri adına sorgulama yapıyor — teknik değil hukuki meseledir |
| Scraping | ❌ HTML scraping yapılmaz; JSON API endpoint'leri kullanılır |
| e-Beyanname | Gerçek dosyalama için GİB'in USB imza akışı gerekir — **MVP dışı** |

**Şifre yönetimi akışı:**
```
1. Müşavir şifreyi UI'ye girer (plaintext)
2. POST /api/gib/secrets → sunucu AES-GCM ile şifreler
3. Şifreli blob → Firestore'a yazılır
4. Sync sırasında: şifreli blob → POST /api/gib/sync → sunucu çözer → IVD'ye bağlanır
5. Plaintext şifre hiçbir zaman istemcide saklanmaz
```

### 6.2 Luca Muhasebe

**Durum:** Kapalı API — **tam entegrasyon MVP dışı.**

Yapılabilecek:
- CSV/Excel export Luca formatında (müşavir manuel import eder)
- Luca'nın sunduğu olası webhook/API çıkarsa eklenecek

### 6.3 KVKK ve Güvenlik

- Müşteri VKN/TCKN ve şahsi verileri Firestore'da saklanır → ofisId bazlı izolasyon zorunlu
- Firestore Security Rules `ofisId` bazında yazılmalı (bkz. §8.2)
- Audit log her okuma/yazma işlemini kaydeder
- WhatsApp mesaj içerikleri `gonderimler` koleksiyonunda saklanır (KVKK kapsamında)
- Prod ortamında `console.log` içinde kişisel veri basılmamalı

---

## 7. WhatsApp Entegrasyonu

### 7.1 Teknik Akış
```
UI (WhatsAppGonderimModal)
  → sendWhatsAppMessages() [lib/integrations/whatsapp/provider.ts]
    → POST /api/whatsapp/send
      → Meta Graph API v19.0 /{phoneNumberId}/messages
        → Müşteri telefonuna mesaj
```

### 7.2 Gereksinimler

| Ortam değişkeni | Açıklama |
|----------------|----------|
| `WHATSAPP_ACCESS_TOKEN` | Meta Cloud API kalıcı/geçici erişim tokeni |
| `WHATSAPP_PHONE_NUMBER_ID` | Business hesabının 15 haneli phone number ID |

### 7.3 Şablon Mesaj Kuralı

Meta Business Messaging Politikası gereği:
- **Oturum mesajı** (24 saat pencere içinde): Herhangi bir metin gönderilebilir.
- **Oturum dışı mesaj**: Meta tarafından onaylanmış **template** kullanılmalı.

Mevcut durum: Serbest metin gönderiliyor → müşteri daha önce mesaj atmışsa çalışır, atmamışsa çalışmaz.

**MVP sonrası yapılacak:**
1. Meta Business Manager'da şablon mesaj oluştur ve onayla
2. `type: "template"` formatıyla gönder
3. Onay süreci ~48 saattir

### 7.4 Retry ve Kuyruk (MVP Sonrası)

```
Başarısız gönderim → gonderimler koleksiyonunda durum: "basarisiz"
→ Manuel retry butonu (mevcut UI'da yok — eklenecek)
→ Otomatik retry: 3 deneme, 5dk arayla (Vercel Cron — MVP dışı)
```

### 7.5 Simülasyon Modu

`WHATSAPP_ACCESS_TOKEN` yoksa `/api/whatsapp/send` **501** döner.  
Provider 501'i yakalar, `simulated: true` ile başarılı dönüş yapar.  
Gonderim kaydı yine Firestore'a yazılır.

---

## 8. Risk Skoru

### 8.1 Puan Sistemi

| Sinyal | Puan |
|--------|------|
| İşlenmemiş tebligat | +25 (ilk), +5 her ek (max 40) |
| Gecikmiş beyanname | +30 (ilk), +10 her ek (max 50) |
| Gecikmiş tahsilat | +20 (ilk), +5 her ek (max 35) |
| Gecikmiş pesinat | +20 |
| Gecikmiş görev | +10 (ilk), +5 her ek (max 25) |
| Kritik öncelikli görev | +10 (ilk), +5 her ek (max 20) |
| KDV2 kontrolsüz belge | +15 (ilk), +5 her ek (max 25) |

**Seviyeler:**
```
0–24  → dusuk   (yeşil)
25–49 → orta    (sarı)
50–74 → yuksek  (turuncu)
75+   → kritik  (kırmızı)
```

### 8.2 Gösterim Kuralları

| Kime | Ne gösterilir |
|------|---------------|
| Müşavir / personel | Skor + seviye + sinyal detayları |
| Mükellef paneli | ⚠️ Risk metresi gösterilmez (kafa karıştırıcı) — MVP sonrası değerlendiri |

> **Not:** Mükellef panelindeki risk metresi şu an visible. MVP'de kaldırılacak.

### 8.3 Risk Skoru Hesaplanmaz, Saklanmaz

Risk skoru Firestore'a yazılmaz; her render'da `hesaplaRiskListesi()` ile anlık hesaplanır.  
Performans için `useMemo` ile önbelleğe alınır.

---

## 9. Test Planı

### 9.1 Kabul Kriterleri

Her kritik özellik için şu test akışları manuel olarak doğrulanmalı:

#### Davet Akışı
1. Müşavir → Ayarlar → Kullanıcılar → "Müşteri Daveti" oluştur
2. Oluşturulan link (`/davet/[token]`) tarayıcıda açılır
3. Ad, soyad, şifre girilir → "Hesap Oluştur"
4. Yönlendirme `/panel`'e olur
5. Panel'de müşteri adı ve verisi görünür (musteriId bağlı)
6. Davet status `kullanildi` olur
7. Aynı link tekrar açılırsa "Davet kullanılamaz" mesajı görünür

#### GİB Sync
1. Ayarlar → Entegrasyon → GİB → IVD kimlik bilgileri gir
2. "Kaydet" → encrypted secret Firestore'a yazılır, plaintext görünmez
3. "Senkronize Et" → tebligat sync
4. Aktif müşteri sayısı kadar API çağrısı gider (her biri farklı musteriVkn ile)
5. Dönen tebligatlar müşteri bazında `tebligatlar` koleksiyonuna yazılır
6. Dashboard'da yeni tebligatlar görünür
7. GİB ulaşılamazsa: hata toast + syncLog `basarisiz` kaydı

#### Beyanname Workflow
1. Beyannameler → "Yeni Beyanname"
2. Müşteri, tür, dönem, son tarih, sorumlu gir → "Oluştur"
3. Yeni beyanname listede `planlandi` ile görünür
4. ▶ butonu → `evrak_bekliyor`
5. ▶ ... → `gonderildi` → `verilmeTarihi` otomatik set olur
6. → `tahakkuk_olustu` → vergi tahakkuku otomatik türer
7. "Düzeltme" butonu → `duzeltme_gerekli`
8. `kapandi` → işlem butonları gizlenir

#### WhatsApp Gönderimi
1. Müşteri paneli → tahakkuk → "WhatsApp bildirim"
2. Modal açılır, müşteri seçilir, şablon seçilir
3. "Gönder" → /api/whatsapp/send çağrılır
4. Env varsa: Meta API'ye istek gider
5. Env yoksa: 501, simülasyon modu, `simulated: true` logu
6. Her iki durumda `gonderimler` koleksiyonuna kayıt düşer
7. Durum: `gonderildi` veya `basarisiz`

#### PDF Rapor
1. Raporlar → "Yeni Rapor" → müşteri, dönem, tür seç → "Üret"
2. "Üretiliyor..." toast görünür
3. ~2.5 sn sonra "Rapor hazır!" toast
4. "İndir" butonu → PDF açılır (gerçek PDF, okunabilir metin içeriyor)
5. Firebase varsa: Storage'a yüklenmiş URL
6. Firebase yoksa: blob URL

---

## 10. UI/UX Tasarım Sistemi

### 10.1 Renk Paleti

| Token | Renk | Kullanım |
|-------|------|----------|
| `blue-600` | Ana mavi | Primary buton, link, aktif nav |
| `slate-900` | Başlık metni | h1-h3 |
| `slate-600` | Gövde metni | paragraf, label |
| `slate-400` | Soluk metin | placeholder, yardımcı |
| `slate-200` | Border | kart border, ayraç |
| `slate-50` | Arka plan | sayfa bg, tablo header |
| `emerald-500` | Başarı | success badge, verildi, ödendi |
| `amber-500` | Uyarı | warning badge, bekliyor, yaklasan |
| `red-500` | Hata/Kritik | danger badge, gecikti, kritik |
| `blue-400` | Bilgi | info badge |

### 10.2 Bileşen Katmanları

```
Sayfa (page.tsx)
  └─ PageHeader           ← Başlık + aksiyon buton
  └─ StatsDrawer          ← Katlanabilir metrik kartları
  └─ Filtre satırı        ← Input + Select grid
  └─ MobileList (< md)    ← Mobil kart listesi
  └─ Table (≥ md)         ← Masaüstü tablo
  └─ Modal(lar)           ← Overlay işlem formları
```

### 10.3 Kart Yapısı

```css
/* Standart kart */
bg-white rounded-xl border border-slate-200 shadow-card p-5

/* Kritik/uyarı kart */
bg-red-50 border-red-200

/* Bilgi kartı */
bg-blue-50 border-blue-200
```

### 10.4 Tablo Davranışı

- Mobilde gizle: `hidden md:block`
- Mobil: `MobileCard` + `MobileField` bileşenleri
- Boş durum: `TableEmpty` bileşeni ("Kayıt bulunamadı")
- Sıralama: mevcut değil (MVP sonrası)
- Sayfalama: mevcut değil (MVP sonrası — yeterli veri olmadan erken)

### 10.5 Loading State

```tsx
if (loading) return <PageLoading />;
```
- Spinner: `w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin`
- Metin: "Yükleniyor..."

### 10.6 Hata Mesajları

```tsx
// Başarı
toast.success("Başlık", "Açıklama opsiyonel")

// Uyarı
toast.warning("Başlık", "Açıklama")

// Hata
toast.error("Başlık", err instanceof Error ? err.message : undefined)

// Bilgi
toast.info("Başlık", "Açıklama")
```

### 10.7 Boş Durum (Empty State)

Her liste sayfasında veri yoksa gösterilmeli:
```tsx
<TableEmpty colSpan={N} />
// veya
<MobileList empty={liste.length === 0}>...</MobileList>
```

### 10.8 Mobil Uyum

- Minimum dokunma hedefi: `min-h-[44px] min-w-[44px]`
- Modal: masaüstünde ortalanmış, mobilde alt çekmece (`items-end sm:items-center`)
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Sidebar: `< md` → drawer (overlay), `≥ md` → sticky side

---

## 11. Öncelik Sırası (Aktif Geliştirme)

### 🔴 P0 — Güvenlik (Blocker)
1. **ofisId Firestore filtresi** — Çok-kiracılı izolasyon eksik; tüm ofisler birbirinin verisini okuyabilir
2. **Firestore Security Rules** — `ofisId` bazlı okuma/yazma kısıtı

### 🔴 P1 — Kritik İşlevsellik
3. **KullaniciYetki kontrolü** — `hasPermission()` helper + sayfa içi guard
4. **Mükellef paneli risk metresi kaldırma** — Müşteri kendi risk skorunu görmemeli

### 🟡 P2 — Önemli Eksik
5. **WhatsApp şablon mesaj** — Meta onaylı template'e geçiş (oturum dışı gönderim için)
6. **Başarısız WhatsApp retry butonu** — gonderimler sayfasında manuel retry
7. **Cron/zamanlayıcı** — Günlük GİB sync, vade hatırlatma (Vercel Cron)

### 🟢 P3 — İyileştirme
8. **Luca CSV export** — Standart format çıktı
9. **Resmi Gazete AI** — Claude API entegrasyonu
10. **E-posta SMTP** — Davet ve rapor e-postası

---

## 12. Ortam Değişkenleri

`.env.local` dosyasında bulunmalı:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# GİB şifreleme (en az 32 karakter)
GIB_SECRET_KEY=

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# (İleride)
# CLAUDE_API_KEY=      ← Resmi Gazete AI özeti
# SMTP_HOST=           ← E-posta gönderimi
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
```

---

## 13. Dizin Yapısı (Kritik Dosyalar)

```
app/
  (auth)/giris/           ← Login sayfası
  (musavir)/              ← Müşavir/personel route grubu [AuthGuard: musavir|personel]
    dashboard/
    musteriler/
    beyannameler/         ← YENİ: Beyanname CRUD + workflow
    tebligatlar/
    gorevler/
    raporlar/
    tahakkuklar/
    risk/
    kdv2/
    yukumlulukler/
    ayarlar/
  (mukellef)/panel/       ← Mükellef self-servis [AuthGuard: mukellef]
  api/
    gib/secrets/          ← Şifre şifreleme endpoint
    gib/sync/             ← IVD senkronizasyon endpoint
    whatsapp/send/        ← Meta Cloud API proxy

components/
  auth/AuthGuard.tsx
  layout/Sidebar.tsx · MusavirShell.tsx · TopBar.tsx
  modals/               ← Tüm modal/drawer bileşenleri
  ui/                   ← Temel UI bileşenleri

lib/
  context/AuthContext.tsx · ToastContext.tsx
  domain/beyanWorkflow.ts · risk.ts · tahakkuk.ts · otomatikGorev.ts
  firebase/client.ts · firestore.ts · repositories.ts · storage.ts
  hooks/useAppData.ts · useCollectionData.ts · useAuditLog.ts
  integrations/gib/ · whatsapp/
  reports/pdfReport.ts · printableReport.ts
  types/index.ts        ← TEK TİP KAYNAĞI — buradan import et
  utils/format.ts · cn.ts
```
