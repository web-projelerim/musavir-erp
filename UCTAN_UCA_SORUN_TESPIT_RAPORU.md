# MusavirERP — Uçtan Uca Sorun Tespit ve Düzeltme Raporu

Tarih: 2026-07-03
Kapsam: Tüm kod tabanı (Next.js app, lib, API route'ları, Cloud Functions, Firestore/Storage kuralları, bağımlılıklar)
Yöntem: Statik analiz (tsc, eslint), bağımlılık taraması (npm audit), güvenlik kural incelemesi, kimlik doğrulama/yetkilendirme akış analizi, birim testleri

Bu rapor iki bölümden oluşur:
- **Bölüm A** — Bu oturumda tespit edilip DÜZELTİLEN sorunlar (dosya referanslarıyla)
- **Bölüm B** — Açık kalan sorunlar, kalıntı riskler ve öneriler (önceliklendirilmiş)

---

## BÖLÜM A — DÜZELTİLEN SORUNLAR

### A1. 🔴 KRİTİK: Rol yükseltme ve tenant sızıntısı — `firestore.rules`

**Sorun:** `kullanicilar` koleksiyonunda `create` kuralı yalnızca uid ve e-posta eşleşmesini kontrol ediyordu. Herhangi bir kullanıcı kayıt olup kendi dokümanına `rol: "musavir"` ve **hedef ofisin `ofisId`sini** yazarak o ofisin tüm verisine (müşteriler, VKN/TCKN, beyannameler, tahsilatlar, belgeler) erişebilirdi. `update` kuralı ise (a) kullanıcının kendi rolünü/ofisini değiştirmesine, (b) herhangi bir ofisin müşavirinin **başka ofislerin** kullanıcılarını güncellemesine izin veriyordu.

**Düzeltme:**
- `create` artık yalnızca iki meşru yoldan mümkün: (1) *self-bootstrap*: yeni müşavir kendi ofisini kurar (`rol == 'musavir' && ofisId == uid`), (2) *davetle katılım*: `davetId` ile referans verilen davet dokümanı `get()` ile doğrulanır — e-posta, rol, ofisId, (mükellefse) musteriId davetle **birebir eşleşmeli** ve davet `bekliyor` durumunda olmalı (`davetGecerli()` fonksiyonu).
- `update`: kullanıcı kendi profilini güncelleyebilir ama `rol, ofisId, musteriId, yetkiler, aktif` alanlarına dokunamaz (`affectedKeys().hasAny` kontrolü); müşavir yalnızca **kendi ofisindeki** kullanıcıları yönetebilir ve `ofisId` değiştiremez.

**Doğrulama:** `tests/rules/firestore.rules.test.ts` içinde 8 saldırı/meşru-akış senaryosu (emülatörle çalışır).

### A2. 🔴 KRİTİK: Storage'da ofis izolasyonu yoktu — `storage.rules`

**Sorun:** `belgeler/` ve `raporlar/` yolları yalnızca `isStaff()` kontrolü yapıyordu. Herhangi bir ofisin personeli, **tüm ofislerin tüm müşteri dosyalarını** okuyabilir ve üzerine yazabilirdi.

**Düzeltme:** `staffOfSameOffice(musteriId)` fonksiyonu eklendi — dosyanın ait olduğu `musteriler/{musteriId}.ofisId`, personelin `kullanicilar/{uid}.ofisId` değeriyle Firestore cross-service lookup üzerinden karşılaştırılıyor. Ayrıca tanımsız tüm yollar açıkça `false` ile kapatıldı.

**Not:** Cross-service lookup her istek için 2 Firestore okuması yapar (`kullanicilar` + `musteriler`); maliyet kabul edilebilir, ancak yoğun kullanımda custom claims'e geçiş değerlendirilebilir (bkz. B1).

### A3. 🔴 KRİTİK: Cron endpoint'leri fail-open — `app/api/cron/*`

**Sorun:** `if (cronSecret && authHeader !== ...)` deseni nedeniyle `CRON_SECRET` env değişkeni tanımlı **değilse** doğrulama tamamen atlanıyor ve `/api/cron/gib-sync`, `/api/cron/vade-hatirlatma`, `/api/cron/vergi-takvimi-sync` endpoint'leri internete açık kalıyordu.

**Düzeltme:** `lib/security/cronAuth.ts` oluşturuldu — `verifyCronSecret()`:
- Secret tanımlı değilse **503 ile reddeder** (fail-closed) ve açıklayıcı mesaj döner,
- Karşılaştırmayı `timingSafeEqual` ile yapar (timing saldırısı koruması),
- Üç cron route'u da bu yardımcıya bağlandı.

**Doğrulama:** `tests/unit/cronAuth.test.ts` (5 test).

### A4. 🔴 KRİTİK: İstemci tarafı otomatik rol terfisi — `lib/context/AuthContext.tsx`

**Sorun:** `rol === "mukellef" && !musteriId` durumunda istemci, kullanıcıyı **otomatik olarak musavir'e terfi ettirip** bunu Firestore'a yazıyordu. Bir mükellefin `musteriId` alanının silinmesi/bozulması tam yetkili müşavir hesabı üretiyordu.

**Düzeltme:** Terfi mantığı kaldırıldı; bozuk kayıt tespit edilirse oturum açılmaz ve kullanıcıya "müşavirinizle iletişime geçin" hatası gösterilir. Rol düzeltmesi yalnızca müşavir/backend tarafından yapılabilir. (Yeni `kullanicilar` update kuralı da istemcinin böyle bir yazma yapmasını zaten engelliyor — savunma iki katmanlı.)

### A5. 🔴 KRİTİK: Demo fallback production'da tam yetki veriyordu — `lib/context/AuthContext.tsx`

**Sorun:** `NEXT_PUBLIC_FIREBASE_*` env değişkenleri eksikse uygulama herhangi bir girişe **tam erişimli musavir** fallback'i veriyordu — production'da yanlış yapılandırma durumunda ciddi risk.

**Düzeltme:** Demo fallback artık yalnızca `NODE_ENV !== "production"` iken çalışır; production'da yapılandırma eksikse açıklayıcı hata fırlatılır.

### A6. 🟠 YÜKSEK: API'lerde rol/ofis yetkilendirmesi yoktu — tüm hassas route'lar

**Sorun:** `requireAuth` yalnızca Firebase kimliğini doğruluyordu; **mükellef rolündeki bir kullanıcı bile** `/api/whatsapp/send` (ofisin hattından keyfi numaraya mesaj), `/api/email/send`, `/api/gib/*`, `/api/sgk/sync`, `/api/secrets/encrypt` endpoint'lerini çağırabiliyordu.

**Düzeltme:** `lib/firebase/verifyToken.ts` içine `requireStaff(req, { allowedRoles })` eklendi:
- Token doğrulamasının üzerine, Admin SDK ile `kullanicilar/{uid}` okunup `rol`, `ofisId`, `aktif` kontrol edilir (istemci kurallarından bağımsız, güvenilir kaynak),
- Admin SDK yapılandırılmamışsa: production'da **fail-closed**, geliştirmede uyarıyla devam,
- Uygulanan route'lar: `whatsapp/send`, `email/send`, `secrets/encrypt`, `gib/secrets` (yalnızca **musavir**), `gib/sync`, `gib/bulk-sync`, `gib/captcha`, `sgk/sync`, `tebligat/pdf`, `vergi-takvimi/sync`, `resmi-gazete/ozetle`.

### A7. 🟠 YÜKSEK: JWT doğrulamasında eksik kontroller — `lib/firebase/verifyToken.ts`

**Sorun:** `iat`, `auth_time`, `sub` doğrulanmıyordu; `PROJECT_ID` boşsa `aud` kontrolü anlamsızlaşıyordu; uid `payload.uid ?? payload.sub` ile alınıyordu (uid standart claim değildir).

**Düzeltme:** `iat`/`auth_time` gelecek-tarih kontrolü (5 dk saat kayması toleransı), `sub` boş-olmama kontrolü, `PROJECT_ID` tanımsızsa hata, uid kaynağı standart `sub` claim'ine sabitlendi.

### A8. 🟠 YÜKSEK: `davetler` update kuralı fazla genişti — `firestore.rules`

**Sorun:** E-postası eşleşen kullanıcı davetin **tüm alanlarını** (rol, ofisId, musteriId, tokenHash) değiştirebiliyordu.

**Düzeltme:** Davetli yalnızca `durum` + `usedAt` yazabilir ve `durum` yalnızca `kullanildi` olabilir (`hasOnly` kontrolü). Ofis personeli de davetin kimlik alanlarını (`email, rol, ofisId, musteriId, tokenHash, davetLinki`) sonradan değiştiremez.

### A9. 🟠 YÜKSEK: Cloud Functions HTTP tetikleyicileri tamamen auth'suzdu — `functions/index.js`

**Sorun:** `runTahakkukNotificationsNow`, `runResmiGazeteNow`, `runGibSyncNow` endpoint'leri hiçbir doğrulama yapmıyordu — herkes WhatsApp bildirim işini tetikleyebilirdi.

**Düzeltme:** `FUNCTIONS_TRIGGER_SECRET` ile fail-closed doğrulama eklendi (secret tanımsızsa 503, yanlışsa 401).

### A10. 🟠 YÜKSEK: `xlsx` 0.18.5 — yaması npm'de olmayan 2 zafiyet

**Sorun:** Prototype Pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9). SheetJS npm'e yeni sürüm yayınlamayı bıraktı; npm'deki son sürüm 0.18.5.

**Düzeltme:** `package.json` bağımlılığı resmi dağıtım kanalına sabitlendi: `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (her iki CVE kapalı, API birebir uyumlu). **⚠️ Yerelde `npm install` çalıştırılmalı** (cdn.sheetjs.com'a erişim gerekir).

### A11. 🟠 YÜKSEK: Next.js 14.2.5 — kritik zafiyetler

**Sorun:** Cache Poisoning (GHSA-gp8f-8m3g-qvj9) dahil birden fazla advisory.

**Düzeltme:** `next` ve `eslint-config-next` **14.2.35**'e yükseltildi (breaking change yok, build doğrulandı). Kalanlar için bkz. B4.

### A12. 🟡 ORTA: Davet API'sinde hash'siz token fallback'i — `app/api/davet/[token]/route.ts`

**Sorun:** `tokenHash` bulunamazsa `davetLinki` alanı üzerinden **düz metin token** aramaya düşülüyordu (ayrıca `>=`/`<=` aynı değerle anlamsız range sorgusuydu). Bu, hash'lemenin amacını boşa çıkarıyordu.

**Düzeltme:** Fallback kaldırıldı; yalnızca `tokenHash` ile arama yapılır. Eski format davetler geçersizdir — gerekirse yeniden davet gönderilmeli.

### A13. 🟡 ORTA: `isEncrypted` yanlış pozitif üretebiliyordu — `lib/security/secrets.ts`

**Sorun:** `"ab:12:ef"` gibi kısa hex parçalı düz metin şifreler "zaten şifreli" sayılıp **şifrelenmeden** Firestore'a yazılabilirdi. (Bu sorunu yeni yazılan birim testi yakaladı.)

**Düzeltme:** IV (24 hex) ve GCM tag (32 hex) uzunluk doğrulaması eklendi.

### A14. 🟡 ORTA: `functions/index.js` sabit `ofis-default` — multi-tenant çelişkisi

**Sorun:** Resmi Gazete özetleri ve GİB sync logları `ofisId: "ofis-default"` ile yazılıyordu — kurallar ofis filtresi uyguladığı için **hiçbir gerçek ofis bu kayıtları göremiyordu**; tahakkuk gönderim logları da yanlış ofise düşebiliyordu.

**Düzeltme:** `getAllOfficeIds()` eklendi; Resmi Gazete özetleri her ofis için ayrı doküman (`{itemId}-{ofisId}`) olarak, GİB sync logları ofis başına yazılıyor. Tahakkuk loglarında sabit fallback kaldırıldı (`ofisId || null`).

### A15. 🟡 ORTA: Lint hataları (4 error)

`react/no-unescaped-entities` (ayarlar, tahakkuklar, tebligat detay sayfalarında `"` ve `'` kaçışları) düzeltildi; `email/send`'de var olmayan ESLint kuralına referans veren disable yorumu kaldırıldı. **Lint error sayısı: 0.**

### A16. 🟡 ORTA: Test altyapısı yoktu (0 test)

**Eklenen:** vitest + `@firebase/rules-unit-testing`; `npm test` (birim), `npm run test:rules` (emülatörlü kural testleri). Mevcut durum: **14/14 birim test geçiyor**; 8 kural testi emülatör başlatılınca çalışır (`firebase emulators:start --only firestore --project demo-musavir`).

### Doğrulama Özeti

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` | ✅ 0 hata |
| `next lint` | ✅ 0 error (5 warning — bkz. B7) |
| `next build` | ✅ 24/24 sayfa |
| `vitest run` | ✅ 14/14 |
| `node --check functions/index.js` | ✅ |

---

## BÖLÜM B — AÇIK KALAN SORUNLAR VE ÖNERİLER

> **Güncelleme (2026-07-03, ikinci tur):** B3, B6, B7, B8, B9 ve B5'in bir bölümü uygulandı — aşağıda ✅ ile işaretlendi. B1, B2, B4, B10 ve B5'in dağıtık kısmı bilinçli olarak sonraki sprint'e bırakıldı (mimari/çaba gerekçeleriyle).

### ✅ B3 — E-posta doğrulaması (UYGULANDI)
Davet dokümanı `davetGecerli()` ile `get()` üzerinden doğrulanıyor; ek olarak istemcide `resolveAppUser`, `davetId` taşıyan kullanıcı `emailVerified` değilse oturumu reddediyor. (Firebase'de yeni hesabın `email_verified`'ı kayıt anında `false` olduğu için kontrol create kuralında değil, oturum açma anında istemcide + kayıt akışında uygulanıyor.)

### ✅ B6 — Audit log bütünlüğü (UYGULANDI)
`auditLogs` create kuralına `actorId == request.auth.uid` eşitliği eklendi; kullanıcı başkası adına log yazamıyor. `update, delete: false` (değiştirilemezlik korunuyor).

### ✅ B7 — Lint uyarıları (UYGULANDI)
Üç captcha `<img>` (base64 data URI) satır bazlı `eslint-disable-next-line @next/next/no-img-element` ile işaretlendi. **Lint: 0 error, 0 warning.**

### ✅ B8 — Anahtar rotasyonu (UYGULANDI)
`verifyToken`'da `kid` bulunamazsa Google sertifika cache'i `getPublicKeys(true)` ile zorla yenilenip bir kez daha deneniyor (key rotation anında geçerli token'ların reddedilmesi önlendi).

### ✅ B9 — Gönderimlerde ofis kapsamı (UYGULANDI)
`lib/firebase/officeScope.ts` → `assertMusterilerInOffice()`; `whatsapp/send` ve `email/send`, hedef `musteriId`'lerin çağıranın ofisine ait olduğunu Admin SDK ile doğruluyor (aksi halde 403). Admin SDK yoksa production'da fail-closed.

### ✅ B5 (kısmi) — Rate limiting (UYGULANDI)
`lib/security/rateLimit.ts` (bağımlısız in-memory sliding-window) eklendi ve en abuse'e açık üç endpoint'e uygulandı: `gib/captcha` (30/dk/kullanıcı), `whatsapp/send` (10/dk/ofis), `email/send` (20/dk/ofis). 429 + `Retry-After` döner.
**Kalan:** Serverless'te her instance kendi penceresini tutar; kesin global limit için Upstash/Vercel KV tabanlı dağıtık çözüm gerekir (sonraki sprint). App Check hâlâ eklenmedi.

---

### Sonraki sprint'e bırakılanlar (bilinçli)

### B1. 🟠 Rol/yetki modeli hâlâ Firestore dokümanına dayanıyor
Kurallar her istekte `kullanicilar/{uid}` okuyor (ekstra okuma maliyeti + `userDoc()` çağrısı kural başına tekrarlanıyor). **Öneri:** Firebase **custom claims**'e geçiş (rol + ofisId claim'e yazılır; kurallar `request.auth.token.rol` okur). Bu hem maliyeti düşürür hem de rol değişikliklerinin tek güvenilir kaynaktan (Admin SDK) yönetilmesini zorlar. Claim yazma işlemi için küçük bir admin API/function gerekir. `requireStaff` de claim okuyarak Firestore okumasını atlayabilir.

### B2. 🟠 İlk kayıt (self-bootstrap) herkese açık
Model gereği herkes kayıt olup **kendi boş ofisini** kurabilir (tenant izolasyonu sayesinde başka veriye erişemez). SaaS olarak bu istenen davranış olabilir; değilse kayıt sayfası davet-only yapılmalı ve self-bootstrap kural yolu kaldırılmalı. Ayrıca `AuthContext`'teki "Firestore belgesi yok → musavir olarak oluştur" kurtarma akışı, yarıda kalmış **mükellef** kayıtlarını yanlışlıkla (kendi boş ofisinde) müşavir yapabilir — davet akışında doküman yazımı başarısız olursa kullanıcıyı davet sayfasına geri yönlendiren bir kontrol eklenebilir.

### B4. 🟠 Kalan bağımlılık zafiyetleri (16 → çoğu düşük pratik risk)
- `next` 14.x için 2 "high" advisory kaldı (Image Optimizer `remotePatterns` DoS — projede `remotePatterns` **kullanılmıyor**, etkilenmez; RSC deserialization DoS). Kalıcı çözüm Next 15 migrasyonu (planlı iş — orta çaba, breaking changes var).
- `glob`/`minimatch`/`rimraf` — yalnızca dev zincirinde (eslint), runtime'a girmiyor.
- `jspdf` → `dompurify` zinciri — webpack alias ile `dompurify: false` stub'landığı için bundle'a girmiyor.
- `xlsx` uyarısı, yerelde `npm install` çalıştırılıp lock dosyası CDN 0.20.3'e güncellenince kapanacak.

### B10. Fonksiyonel eksikler (EKSIKLER.md'den devralınan, hâlâ açık)
- Gerçek Firebase projesiyle uçtan uca smoke test (P0 listesindeki 7 adım)
- WhatsApp gerçek provider webhook/retry/teslim durumları
- GİB gerçek entegrasyonu (şu an mock/manuel); Luca senkronizasyonu
- Queue/worker altyapısı (sync işleri istemci akışı dışına taşınmalı)
- Bildirim tercihleri kalıcılığı, şifre değiştirme akışının tamamlanması
- KDV2 tevkifat oranlarının hizmet/fatura tipine göre detaylandırılması
- Risk geçmişi modeli, belge versiyonlama/onay akışı, rapor şablon modeli
- VKN/TCKN maskeleme ve alan bazlı yetki (özellikle personel rolü için)

### Önerilen sıradaki sprint
1. Yerelde `npm install` + `firebase deploy --only firestore:rules,storage` + emülatörde `npm run test:rules`
2. B3 (email_verified) + B6 (actorId eşitliği) — iki küçük kural değişikliği
3. B9 (gönderimlerde ofis kapsamı) — `requireStaff.ofisId` zaten mevcut, 3 route'a kontrol eklemek yeterli
4. B1 (custom claims) — orta çaba, kalıcı mimari iyileştirme
5. P0 smoke test listesi (TODO_GUNCEL.md)

---

## Değişen/Eklenen Dosyalar

**Güvenlik kuralları:** `firestore.rules`, `storage.rules`
**Yeni modüller:** `lib/security/cronAuth.ts`
**Güncellenen:** `lib/firebase/verifyToken.ts` (requireStaff + JWT sertleştirme), `lib/context/AuthContext.tsx`, `lib/security/secrets.ts`, `functions/index.js`
**API route'ları (12):** `cron/gib-sync`, `cron/vade-hatirlatma`, `cron/vergi-takvimi-sync`, `whatsapp/send`, `email/send`, `secrets/encrypt`, `gib/secrets`, `gib/sync`, `gib/bulk-sync`, `gib/captcha`, `sgk/sync`, `tebligat/pdf`, `vergi-takvimi/sync`, `resmi-gazete/ozetle`, `davet/[token]`
**UI (lint):** `ayarlar`, `tahakkuklar`, `tebligatlar/[id]` sayfaları
**Test:** `vitest.config.ts`, `vitest.rules.config.ts`, `tests/unit/*` (3 dosya, 14 test), `tests/rules/firestore.rules.test.ts` (8 senaryo), `tests/mocks/server-only.ts`
**Bağımlılık:** `next` 14.2.5 → 14.2.35, `xlsx` → CDN 0.20.3 sabitlemesi, vitest + rules-unit-testing (dev)
