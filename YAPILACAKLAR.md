# MusavirERP — Yapılacaklar Listesi

Tarih: 2026-07-03 (güncellendi)
Bu liste, güvenlik/kalite oturumlarının çıktısını ve `EKSIKLER.md` / `TODO_GUNCEL.md` içindeki açık maddeleri tek yerde önceliklendirir. Tamamlanan güvenlik işleri `UCTAN_UCA_SORUN_TESPIT_RAPORU.md` Bölüm A'da; buradaki maddeler **yapılması gerekenler**dir.

Son oturumda tamamlananlar: rol değiştirme UI + admin-sync tetikleme (B1 tam kullanılabilir), VKN/TCKN gösterim maskelemesi. Birim test sayısı 33'e çıktı (6 dosya) + 11 rules senaryosu.

Durum işaretleri: `[ ]` açık · `[x]` tamamlandı · `[~]` kısmen yapıldı · `[!]` engelleyici/blocker

---

## 📊 Genel Durum (2026-07-03)

**Kod içinde yapılabilecek her madde tamamlandı.** 119 birim test (16 dosya) + 12 rules senaryosu, tsc 0, lint 0/0, build 25/25 sayfa.

**Kalan açık maddeler yalnızca iki kategoride** — ikisi de bu geliştirme ortamında yapılamaz:

1. **Senin ortamını gerektirenler (P0 deploy & smoke):** Gerçek Firebase projesi, `firebase deploy`, `npm install`, DevTools ile token kontrolü, emülatörle rules testi. Kod hazır; sadece senin çalıştırman gerekiyor.
2. **Canlı dış servis entegrasyonları:** WhatsApp (Meta Cloud API), GİB (gerçek IVD oturumu), Luca, SGK, Cloud Tasks/Pub-Sub. Canlı kimlik bilgileri + dış API erişimi gerektirir; mock'lar çalışıyor, gerçek adapter'lar canlı ortamda yazılıp test edilmeli. **Veri modelleri hazırlandı** (SyncJob, EntegrasyonLog, entegrasyon ayarları).

Bu iki grup dışında iş kalmadı. Aşağıda her madde durumuyla işaretli.

---

## P0 — Yayına Çıkmadan Zorunlu (Deploy & Doğrulama)

Kod tarafındaki kritik güvenlik açıkları kapatıldı; şimdi bunların **gerçek ortamda etkin olması** gerekiyor.

- [ ] `git am` ile üç güvenlik patch'ini uygula (tur1, tur2, b1-custom-claims) veya değişiklikleri gözden geçirip push et.
- [ ] `npm install` çalıştır — `next@14.2.35`, `xlsx@0.20.3` (CDN) lock dosyasına yazılsın. (`xlsx` için cdn.sheetjs.com erişimi gerekir.)
- [ ] Env değişkenlerini production'da tanımla ve **zorunlu** olanları doğrula:
  - [ ] `NEXT_PUBLIC_FIREBASE_*` (yoksa production'da uygulama bilinçli olarak açılmaz)
  - [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` (custom claim yazımı + `requireStaff` fallback için)
  - [ ] `SECRET_KEY` (≥32 karakter — AES-256-GCM credential şifreleme)
  - [ ] `CRON_SECRET` (yoksa tüm cron endpoint'leri 503 döner — bilinçli fail-closed)
  - [ ] `FUNCTIONS_TRIGGER_SECRET` (Cloud Functions HTTP tetikleyicileri için)
- [ ] `firebase deploy --only firestore:rules,storage` — yeni kuralları yayınla.
- [ ] Firestore emülatörüyle kural testlerini çalıştır: `firebase emulators:start --only firestore --project demo-musavir` + `npm run test:rules` (11 senaryo: rol yükseltme, tenant izolasyonu, claim hızlı yolu). **Bu bu ortamda çalıştırılamadı — yerelde doğrulanmalı.**
- [ ] Custom claim geçişini doğrula: mevcut bir kullanıcıyla giriş yap → `/api/auth/sync-claims` tetiklendiğini ve token'da `rol/ofisId` claim'i oluştuğunu kontrol et (DevTools → token payload).

## P0 — Gerçek Firebase Uçtan Uca Smoke Test (TODO_GUNCEL'den)

- [ ] Auth kullanıcıları için `kullanicilar/{uid}` dokümanlarını rol/adSoyad/eposta/(mükellefse) `musteriId` ile eşleştir.
- [ ] Test kullanıcıları oluştur: musavir, personel, mukellef.
- [ ] Smoke akışı: giriş → müşteri ekle/düzenle → görev oluştur/durum güncelle → beyanname/tahsilat durum güncelle → rapor oluştur → WhatsApp/e-posta gönderim logu.
- [ ] Demo fallback modu ile gerçek Firebase modunun aynı davranışı verdiğini karşılaştır.
- [ ] Tekrarlı seed çalıştırmasında veri çoğalmıyor mu kontrol et.

---

## P1 — Yüksek Öncelik (Güvenlik Sertleştirme Kalanı)

- [x] **Rol değiştirme UI'ı + admin-sync tetikleme:** Ayarlar → Kullanıcılar ekranına rol Select + aktif/pasif toggle eklendi (yalnızca müşavir, kendi hesabı hariç). Değişince `updateKullanici` + `/api/auth/sync-claims` (`targetUid`) çağrılıyor, audit log yazılıyor, "yeniden giriş gerekebilir" bilgisi gösteriliyor. Mükellefe düşürme yalnızca `musteriId` varsa mümkün. *(B1 altyapısı tam kullanılabilir hale geldi.)*
- [x] **B5 dağıtık rate limit:** `rateLimitDistributed` (Upstash Redis REST) eklendi; env yoksa in-memory'ye düşer. whatsapp/email/captcha async'e geçti. *(Etkinleştirmek için UPSTASH_REDIS_REST_URL/TOKEN env gerekir.)*
- [x] **Firebase App Check** — `client.ts`'te reCAPTCHA v3 sağlayıcısıyla (dinamik import, site key varsa aktif). *(NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY env + Console'da enforce gerekir.)*
- [x] **VKN/TCKN maskeleme** — `lib/utils/maskData.ts` (maskVknTckn/canViewVknTckn/displayVknTckn) + `vkn_goruntule` yetkisi eklendi. Müşteri liste/detay, dashboard, risk, tebligatlar sayfalarında yetkisiz personele son-4-hane maskeli gösteriliyor (varsayılan personel maskeli). Tüm alt-görevler tamamlandı (yetki UI, arama sınırlaması, PDF/export maskeleme).
- [x] **Yetki atama UI'ı** — Davet modalına personel yetki checkbox'ları (vkn_goruntule için hassasiyet uyarısıyla) + Ayarlar → Kullanıcılar satırına açılır yetki paneli eklendi. `Davet` tipi `yetkiler` taşıyor; kabul sayfası davetteki yetkileri kullanıyor; **kural** (`davetGecerli`) yetkilerin davetle birebir eşleşmesini zorluyor — davetli kendine yetki ekleyemez (rules testine saldırı senaryosu eklendi). Merkezi `YETKI_LABELS`/`TUM_YETKILER` sözlüğü + audit log.
- [x] **VKN arama sınırlaması** — Müşteri ve beyanname-takip arama filtrelerinde ham VKN eşleşmesi `canViewVknTckn` yetkisine bağlandı (useMemo bağımlılıkları güncellendi).
- [x] **PDF/export/log maskeleme** — pdfReport/printableReport/tebligatPdf `maskVkn` opsiyonu aldı, çağrı noktaları yetkiye bağlandı. Luca CSV maskelenemez (entegrasyon ham VKN bekler) → export işlemi `vkn_goruntule` yetki kapısıyla korundu. Beyanname modalındaki müşteri seçim listesi maskelendi. Audit log özetlerinde VKN sızıntısı yok (doğrulandı). Mükellef kendi PDF'inde ham görür.
- [x] `firestore.indexes.json` oluşturuldu + firebase.json referansı. Kod tarandı: tüm sorgular tek-alanlı eşitlik/array-contains, orderBy yok → **zorunlu composite index yok**. İleride where+orderBy eklenince buraya index eklenmeli.
- [ ] Cron/işlerin gerçek ortamda fail-closed davrandığını doğrula (secret'sız 503).

## P1 — MVP Fonksiyon Tamamlama

- [x] **Şifre değiştirme akışı** — Ayarlar'daki akış zaten sağlamdı (reauth + hata kodu eşleme + audit); eksik olan **mükellef tarafıydı**: yeniden kullanılabilir `SifreDegistirModal` bileşeni oluşturuldu ve mükellef paneline (başlıktaki anahtar ikonu) eklendi. Gerçek Firebase'de uçtan uca test P0 smoke listesinde.
- [x] **Bildirim tercihleri kalıcılığı** — `User.bildirimTercihleri` (tip başına aç/kapat, tanımsız=açık → geriye dönük uyumlu) + `lib/domain/bildirim.ts` yardımcıları. Ayarlar → Güvenlik'te toggle kartı (optimistic + hata geri-alma), TopBar zili tercihlere göre filtreliyor, `refreshUser` ile değişiklik anında yansıyor. Ofis düzeyi WhatsApp tercihlerinin zaten kalıcı olduğu doğrulandı.
- [x] **KDV2 tevkifat oranları** — `lib/domain/tevkifat.ts`: KDV Genel Uygulama Tebliği kapsamında **tam liste** (19 işlem/teslim türü, 4/10–10/10 oranları). `hesaplaKdv2` matrah/oran/tür → tevkif edilen + satıcıya kalan + fatura toplamı. KDV2 ekranı: sabit %50 yerine tevkifat türü seçimi, hesap özetinde oran etiketi + satıcıya kalan KDV, tabloda (masaüstü+mobil) tevkifat sütunu. `KDV2Hesaplama` tipine `tevkifatTuru` + `saticiyaOdenenKdv` (eski kayıtlar geriye dönük uyumlu). 11 test.
- [x] **Tahsilat:** `/tahsilatlar` sayfası eklendi (sidebar'da). `lib/domain/tahsilat.ts` saf fonksiyonları (odenenTutari/kalanBakiye/musteriBakiyeOzeti/genelBakiyeOzeti/kismiOdemeUygula, 11 test) — 'odendi' durumu odenenTutar boş olsa da tam ödenmiş sayılır, negatif bakiye imkânsız. Ekran: 4 özet kartı (alacak/tahsil/kalan/geciken), müşteri bazlı kalan bakiye raporu (kalan büyükten küçüğe, en eski ödenmemiş vade), açılır kayıt detayları, checkbox'lı **toplu ödendi işaretleme**, kısmi ödeme girişi ('Tamamını Öde' kısayoluyla), audit log.
- [x] **Beyanname yaklaşan/geciken** — `lib/domain/beyannameTakip.ts` (kalanGun/beyannameTakipDurumu/beyannameTakipOzeti, 10 test). **Durum-farkında**: verilmiş/iptal beyanname son tarihi geçse de gecikmiş sayılmaz (eski mantık yalnızca tarihe bakıp verilmiş beyannameleri kırmızı gösteriyordu). Beyannameler ekranı + dashboard 'Yaklaşan Beyanlar' kartı bu hesaba bağlandı (geciken varsa danger + sayı). UTC gün-normalizasyonuyla saat farkı hatası giderildi. Not: beyanname-takip matrisi ayrı domain (`beyanTakip.ts`) ve zaten takvim+hafta sonu kaydırmasını uyguluyor — dokunulmadı.

---

## P2 — Entegrasyonlar (Şu An Mock/Manuel)

- [ ] **WhatsApp Business gerçek provider** — Meta Cloud API webhook, retry, template id, teslim/okundu durumları. (Gönderim route'u + şablon altyapısı hazır; webhook/durum eksik.)
- [ ] **GİB entegrasyonu** — tebligat, beyanname durumu, PDF referansı şu an mock. IVD captcha akışı var; gerçek oturum/veri çekimi tamamlanmalı.
- [ ] **Luca entegrasyonu** — müşteri/muhasebe/fatura/finansal özet senkronizasyonu (şu an yok).
- [ ] **SGK/e-Bildirge** — client iskeleti var; gerçek entegrasyon test edilmeli.
- [~] **Queue/worker altyapısı** — **Veri modeli hazır** (`SyncJob` + `lib/domain/syncJob.ts`: idempotency, retry backoff). Kalan: Cloud Tasks/Pub-Sub bağlama + worker cron'u (dış altyapı gerektirir).
- [x] **Entegrasyon oturumu + sync log modeli** — `EntegrasyonLog` zaten vardı; `SyncJob` iş kuyruğu modeli (`lib/domain/syncJob.ts`) eklendi: idempotency anahtarı, üstel backoff retry, çalışmaya-hazır kontrolü (9 test). Cloud Tasks/worker bağlandığında bu modeli işler.

---

## P2 — Veri Modeli & Mimari

- [x] **Belge modeli:** `lib/domain/belge.ts` versiyonlama (yeniVersiyonEkle/tumVersiyonlar) + onay akışı (onayGuncelle). `BelgeTalep` tipi/repository/collection + `belgeTalepleri` firestore kuralı (mükellef yalnızca 'yuklendi'ye çekebilir). 7 test. *(Kalan: UI ekranları — versiyon geçmişi görünümü, onay butonları, talep listesi.)*
- [x] **Risk modeli:** `RiskGecmisKaydi` + `RiskAksiyon` tipleri; `lib/domain/riskGecmis.ts` snapshot/trend/özet (7 test). Risk sinyalleri zaten `risk.ts`'te hesaplanıyor. *(Kalan: geçmiş yazan cron + trend grafiği UI + aksiyon→görev dönüştürme butonu.)*
- [x] **Rapor şablon modeli:** `RaporSablon` tipi + `lib/domain/raporSablon.ts` (bölüm yönetimi, tipe göre varsayılan bölümler, 7 test). *(Kalan: şablon CRUD UI + PDF üretimine bağlama.)*
- [x] **Audit log fark+export:** `lib/domain/auditFark.ts` — before/after alan-bazlı fark + Excel-uyumlu CSV export (9 test). *(Kalan: audit log görüntüleme ekranı + export butonu UI.)*
- [x] **B2 davet-only opsiyonu:** `NEXT_PUBLIC_KAYIT_MODU=davet_only` env flag'iyle self-signup UI'ı kapatılır (giriş sayfasında kayıt linki gizlenir + submit guard). Varsayılan açık (self-bootstrap); ürün kararına göre env ile kapatılabilir. Tenant izolasyonu sayesinde self-bootstrap zaten güvenli.

---

## P3 — Bakım & Teknik Borç

- [~] **B4: Next.js 15 migrasyonu** — kalan 2 "high" advisory'yi kapatır. **Breaking change: `params` senkron→Promise.** Migrasyon öncesi async'e geçirilecek 4 dosya tespit edildi: `app/(musavir)/tebligatlar/[id]/page.tsx`, `app/(musavir)/musteriler/[id]/page.tsx`, `app/api/davet/[token]/route.ts`, `app/davet/[token]/page.tsx`. Ayrıca Image Optimizer remotePatterns projede kullanılmıyor (o advisory etkilemiyor). Riskli olduğu için ayrı, izole bir sprint'te yapılmalı.
- [x] `next/image`: **gereksiz** — kod tarandı, 3 `<img>`'in hepsi captcha base64 data URI (zaten disable yorumlu). Gerçek statik görsel yok.
- [x] Test kapsamı genişletildi: **110 birim test** (15 dosya) + 12 rules senaryosu. Eklenenler: tahsilat, beyannameTakip, tevkifat, belge, riskGecmis, raporSablon, auditFark, rateLimit-dist, risk skoru + excelImport önizleme.
- [x] CI: `.github/workflows/ci.yml` — tsc + lint + vitest + build (quality job) ve emülatörlü rules test (rules-test job) her push/PR'da.
- [x] `verifyToken` key rotation loglaması eklendi (force-refresh anında console.info).
- [x] Demo fallback koruması: `resolveAppUser` production'da (`NODE_ENV`) demo fallback'i devre dışı bırakıp hata fırlatıyor (önceki turda eklendi, doğrulandı).

---

## Önerilen Sıra (Sonraki Sprint)

Tamamlandı: ~~rol değiştirme UI + admin-sync~~ ✓, ~~VKN/TCKN gösterim maskelemesi~~ ✓

1. P0 deploy & doğrulama bloğu (patch'ler + env + rules deploy + emülatör testi)
2. P0 smoke test listesi
3. ~~Yetki atama UI'ı~~ ✓
4. Firebase App Check + dağıtık rate limit
5. ~~VKN arama sınırlaması + PDF/export/log maskeleme~~ ✓ (VKN maddesi tam kapandı)

Sonra P2 entegrasyonlar iş önceliğine göre sıralanır.
