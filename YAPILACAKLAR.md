# MusavirERP — Yapılacaklar Listesi

Tarih: 2026-07-03 (güncellendi)
Bu liste, güvenlik/kalite oturumlarının çıktısını ve `EKSIKLER.md` / `TODO_GUNCEL.md` içindeki açık maddeleri tek yerde önceliklendirir. Tamamlanan güvenlik işleri `UCTAN_UCA_SORUN_TESPIT_RAPORU.md` Bölüm A'da; buradaki maddeler **yapılması gerekenler**dir.

Son oturumda tamamlananlar: rol değiştirme UI + admin-sync tetikleme (B1 tam kullanılabilir), VKN/TCKN gösterim maskelemesi. Birim test sayısı 33'e çıktı (6 dosya) + 11 rules senaryosu.

Durum işaretleri: `[ ]` açık · `[x]` tamamlandı · `[~]` kısmen yapıldı · `[!]` engelleyici/blocker

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
- [ ] **B5 dağıtık rate limit:** Mevcut in-memory limiter serverless'te instance başına çalışır. Upstash Redis / Vercel KV tabanlı global limite geçir (özellikle `whatsapp/send`, `email/send`, `gib/captcha`).
- [ ] **Firebase App Check** ekle (reCAPTCHA/attestation) — bot ve kötüye kullanım koruması.
- [~] **VKN/TCKN maskeleme** — `lib/utils/maskData.ts` (maskVknTckn/canViewVknTckn/displayVknTckn) + `vkn_goruntule` yetkisi eklendi. Müşteri liste/detay, dashboard, risk, tebligatlar sayfalarında yetkisiz personele son-4-hane maskeli gösteriliyor (varsayılan personel maskeli). Yetki atama UI'ı tamamlandı; kalan alt-görevler aşağıda.
- [x] **Yetki atama UI'ı** — Davet modalına personel yetki checkbox'ları (vkn_goruntule için hassasiyet uyarısıyla) + Ayarlar → Kullanıcılar satırına açılır yetki paneli eklendi. `Davet` tipi `yetkiler` taşıyor; kabul sayfası davetteki yetkileri kullanıyor; **kural** (`davetGecerli`) yetkilerin davetle birebir eşleşmesini zorluyor — davetli kendine yetki ekleyemez (rules testine saldırı senaryosu eklendi). Merkezi `YETKI_LABELS`/`TUM_YETKILER` sözlüğü + audit log.
- [ ] **VKN arama sınırlaması** — Yetkisiz personel için müşteri/beyanname-takip arama filtrelerinde ham VKN eşleşmesini kapat (kör aramayla hane doğrulama sızıntısını önle).
- [ ] **PDF/export/log maskeleme** — Rapor PDF'leri, Excel/Luca export'ları ve audit/log çıktılarında yetkisiz roller için VKN/TCKN ve finansal alan maskeleme.
- [ ] `firestore.indexes.json` oluştur ve deploy et — `davetler` tokenHash sorgusu ve diğer composite sorgular için gerekli index'leri tanımla.
- [ ] Cron/işlerin gerçek ortamda fail-closed davrandığını doğrula (secret'sız 503).

## P1 — MVP Fonksiyon Tamamlama

- [ ] **Şifre değiştirme akışı** — Ayarlar ekranında tamamla (reauth + updatePassword zaten kısmen var; uçtan uca test et).
- [ ] **Bildirim tercihleri kalıcılığı** — kullanıcı bazlı ayar modeli + Firestore persist.
- [ ] **KDV2 tevkifat oranları** — hizmet/fatura tipine göre kapsamlı seçim.
- [ ] **Tahsilat:** kalan bakiye raporlama + toplu tahsilat ekranı.
- [ ] **Beyanname yaklaşan/geciken** hesaplarını aktif dönem tarihine tam bağla.

---

## P2 — Entegrasyonlar (Şu An Mock/Manuel)

- [ ] **WhatsApp Business gerçek provider** — Meta Cloud API webhook, retry, template id, teslim/okundu durumları. (Gönderim route'u + şablon altyapısı hazır; webhook/durum eksik.)
- [ ] **GİB entegrasyonu** — tebligat, beyanname durumu, PDF referansı şu an mock. IVD captcha akışı var; gerçek oturum/veri çekimi tamamlanmalı.
- [ ] **Luca entegrasyonu** — müşteri/muhasebe/fatura/finansal özet senkronizasyonu (şu an yok).
- [ ] **SGK/e-Bildirge** — client iskeleti var; gerçek entegrasyon test edilmeli.
- [ ] **Queue/worker altyapısı** — rapor üretimi ve sync işlerini istemci/HTTP akışı dışına taşı (Cloud Tasks / Pub-Sub).
- [ ] **Entegrasyon oturumu + sync log modeli** — tutarlı izleme.

---

## P2 — Veri Modeli & Mimari

- [ ] **Belge modeli:** versiyonlama, onay durumu, belge talep akışı.
- [ ] **Risk modeli:** risk sinyali + risk geçmişi + aksiyon başlatma akışları.
- [ ] **Rapor şablon modeli.**
- [ ] **Audit log:** alan bazlı fark görünümü + export (temel create/immutability kuralı hazır).
- [ ] **B2 karar:** Kayıt herkese açık self-bootstrap mı kalsın, yoksa davet-only mı olsun? *(Ürün kararı — belirlendikten sonra kural/UI'da uygulanacak.)* Ayrıca `AuthContext`'teki "doküman yoksa musavir oluştur" kurtarma akışını gözden geçir.

---

## P3 — Bakım & Teknik Borç

- [ ] **B4: Next.js 15 migrasyonu** — kalan 2 "high" advisory'yi kapatır (Image Optimizer remotePatterns projede kullanılmıyor, RSC deserialization). Breaking change içerir, planlı yapılmalı.
- [ ] `next/image`'e geçiş (captcha dışı gerçek görseller için) — şu an captcha base64'leri bilinçli `<img>`.
- [ ] Test kapsamını genişlet: domain fonksiyonları (risk, tahakkuk, beyanTakip, excelImport) için birim testler. Şu an 18 birim + 11 rules senaryosu.
- [ ] CI kur (GitHub Actions): `tsc --noEmit`, `next lint`, `vitest run`, emülatörlü `test:rules` — her PR'da.
- [ ] `verifyToken` anahtar önbelleği için basit gözlemlenebilirlik (rotation log'u).
- [ ] Dev-only demo fallback'in production build'e hiç sızmadığını düzenli doğrula.

---

## Önerilen Sıra (Sonraki Sprint)

Tamamlandı: ~~rol değiştirme UI + admin-sync~~ ✓, ~~VKN/TCKN gösterim maskelemesi~~ ✓

1. P0 deploy & doğrulama bloğu (patch'ler + env + rules deploy + emülatör testi)
2. P0 smoke test listesi
3. ~~Yetki atama UI'ı~~ ✓
4. Firebase App Check + dağıtık rate limit
5. VKN arama sınırlaması + PDF/export/log maskeleme (VKN maddesini tam kapatır)

Sonra P2 entegrasyonlar iş önceliğine göre sıralanır.
