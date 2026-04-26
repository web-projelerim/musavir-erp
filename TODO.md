# MusavirERP — Öncelikli Geliştirme Listesi

> Detaylı spesifikasyon, veri modeli, yetki matrisi ve değişiklik protokolü için → `CLAUDE.md`

---

## 🔴 P0 — Güvenlik (Üretim Bloker)

### P0-1 · ofisId Firestore Filtresi
**Problem:** `subscribeCollection()` tüm koleksiyonu filtre olmadan çekiyor.
Farklı ofisler birbirinin müşteri/beyanname/tebligat verisini görebiliyor.

**Etkilenen dosyalar:**
- `lib/firebase/firestore.ts` → `subscribeCollection()` imzası
- `lib/hooks/useCollectionData.ts` → `ofisId` parametresi alacak
- `lib/hooks/useAppData.ts` → her `useCollectionData()` çağrısına `ofisId` geçilecek

**Çözüm:**
```ts
// Mevcut
onSnapshot(collection(db, collectionName), ...)

// Hedef
const q = query(collection(db, collectionName), where("ofisId", "==", ofisId));
onSnapshot(q, ...)
```

**Kabul Kriteri:**
- [ ] İki farklı ofis hesabı birbirinin verisini görmüyor
- [ ] Demo mod (Firebase yok) çalışmaya devam ediyor
- [ ] `ofisId` alanı olmayan koleksiyonlar (davetler, kullanicilar) ayrı handle ediliyor
- [ ] `npx tsc --noEmit` → 0 hata

---

### P0-2 · Firestore Security Rules
**Problem:** Frontend filtresi tek başına güvensiz. Firestore Rules sunucu tarafında izolasyonu
zorunlu kılar; doğrudan SDK çağrılarına karşı tek gerçek savunma hattıdır.

**Etkilenen dosya:** `firestore.rules`

**Hedef kural yapısı:**
```js
function sameOffice(ofisId) {
  return request.auth != null &&
    get(/databases/$(database)/documents/kullanicilar/$(request.auth.uid)).data.ofisId == ofisId;
}

// Tüm ofis-bazlı koleksiyonlar
match /{collection}/{docId} {
  allow read:   if sameOffice(resource.data.ofisId)
                || (request.auth.uid != null &&
                    get(...kullanicilar/$(request.auth.uid)).data.musteriId == resource.data.musteriId);
  allow create: if sameOffice(request.resource.data.ofisId);
  allow update: if sameOffice(resource.data.ofisId);
  allow delete: if sameOffice(resource.data.ofisId);
}
```

**Kabul Kriteri:**
- [ ] `firebase emulators:start` ile kurallar test edildi
- [ ] Farklı ofis kullanıcısı başka ofis belgesine erişemez (permission-denied)
- [ ] Mükellef sadece kendi musteriId'li belgeleri okuyabiliyor
- [ ] Müşavir kendi ofisinde tam CRUD yapabiliyor

---

## 🔴 P1 — Kritik İşlevsellik

### P1-1 · hasPermission() Helper
**Problem:** Personel rolü tüm müşavir sayfalarına erişiyor; hangi butonu/formu
görebileceği kontrol edilmiyor. `KullaniciYetki` tipi tanımlı ama hiç kullanılmıyor.

**Yeni dosya:** `lib/utils/permissions.ts`
```ts
export function hasPermission(user: User | null, yetki: KullaniciYetki): boolean {
  if (!user) return false;
  if (user.rol === "musavir") return true;
  if (user.rol === "mukellef") return false;
  return user.yetkiler?.includes(yetki) ?? false;
}
```

**Hangi sayfalara eklenecek:**

| Sayfa | Kontrol |
|-------|---------|
| `musteriler/page.tsx` | "Yeni Müşteri" butonu → `musteri_yazma` |
| `musteriler/[id]/page.tsx` | Kaydet/düzenle → `musteri_yazma` |
| `tahakkuklar/page.tsx` | Yeni tahakkuk → `tahakkuk_yazma` |
| `raporlar/page.tsx` | Rapor üret → `rapor_yonetimi` |
| `ayarlar/page.tsx` | Tüm sekme → sadece `musavir` rolü |

**Kabul Kriteri:**
- [ ] `personel` + `musteri_yazma` yetkisi olmadan "Yeni Müşteri" butonu görünmüyor
- [ ] `musavir` her şeyi görebiliyor
- [ ] TypeScript tipi doğru → `npx tsc --noEmit` → 0 hata

---

### P1-2 · Mükellef Panelinden Risk Metresini Kaldır
**Problem:** `app/(mukellef)/panel/page.tsx` müşteriye kendi risk skorunu gösteriyor.
Müşteri bunu anlayamaz; "kötü müşteri" damgası riski var.

**Etkilenen dosya:** `app/(mukellef)/panel/page.tsx`

**Yapılacak:**
- `<RiskMetre>` bileşenini ve `hesaplaMusteriRisk()` çağrısını kaldır
- "Risk Seviyesi" istatistik kartını kaldır
- Yerine nötr bir "Müşavirlik Durumu: Aktif" göstergesi koy

**Kabul Kriteri:**
- [ ] Panel'de risk skoru/seviyesi gösterilmiyor
- [ ] Müşteri yine de beyanname/tebligat/tahakkuk özetini görüyor

---

## 🟡 P2 — Önemli Eksik

### P2-1 · WhatsApp Şablon Mesaj Desteği
**Problem:** Meta Messaging Policy gereği 24 saatlik oturum penceresi dışında serbest metin
gönderilemez. Müşteri daha önce mesaj atmazsa (çoğunlukla bu durum) mesaj iletilmiyor.

**Etkilenen dosyalar:**
- `app/api/whatsapp/send/route.ts`
- `components/modals/WhatsAppGonderimModal.tsx`

**Meta template mesaj formatı:**
```json
{
  "type": "template",
  "template": {
    "name": "musavir_hatirlatma",
    "language": { "code": "tr" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "{{firma_adi}}" },
        { "type": "text", "text": "{{beyan_turu}}" },
        { "type": "text", "text": "{{son_tarih}}" }
      ]
    }]
  }
}
```

**Adımlar:**
1. Meta Business Manager'da şablon oluştur + onaylat (~48 saat)
2. `route.ts`'e `useTemplate: boolean` parametresi ekle
3. UI'ya "Oturum Mesajı / Şablon Mesajı" toggle'ı ekle

**Kabul Kriteri:**
- [ ] Onaylı template ile 24 saat dışı gönderim çalışıyor
- [ ] Template adı ayarlardan konfigüre edilebiliyor

---

### P2-2 · Başarısız WhatsApp Gönderim Retry
**Problem:** `durum: "basarisiz"` olan gönderimler için retry mekanizması yok.
Kullanıcı hatayı görüyor ama yeniden gönderemiyor.

**Nerede:** `app/(musavir)/ayarlar/page.tsx` → yeni "Gönderimler" alt sekmesi

**Yapılacak:**
- `gonderimler` koleksiyonunu filtreli listele (durum: basarisiz)
- Her satırda "Yeniden Gönder" butonu
- Tıklayınca: `/api/whatsapp/send` → `denemeSayisi++` → durum güncelle

**Kabul Kriteri:**
- [ ] Başarısız gönderimler listeleniyor, neden başarısız olduğu gösteriliyor
- [ ] Retry çalışıyor, `denemeSayisi` artıyor
- [ ] Max 3 denemeden sonra buton devre dışı

---

### P2-3 · Vercel Cron — Otomatik Zamanlayıcılar
**Problem:** GİB sync ve vade hatırlatmaları tamamen manüel. Üretimde günlük otomatik
çalışması gerekiyor.

**Yeni dosyalar:**
- `app/api/cron/gib-sync/route.ts`
- `app/api/cron/vade-hatirlatma/route.ts`
- `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/gib-sync", "schedule": "0 8 * * *" },
    { "path": "/api/cron/vade-hatirlatma", "schedule": "0 9 * * *" }
  ]
}
```

**GİB cron akışı:**
1. Tüm ofislerin aktif GİB entegrasyon ayarlarını çek
2. Her ofis → aktif müşteriler → `/api/gib/sync` (musteriVkn ile)
3. Sonuçları Firestore'a yaz + GibSyncLog

**Vade hatırlatma akışı:**
1. Vade tarihi 3 gün içinde olan tahakkukları bul
2. Müşteri telefonlarına WhatsApp gönder
3. GonderimKaydi oluştur

**Kabul Kriteri:**
- [ ] `vercel.json` cron tanımları deploy sonrası aktif
- [ ] Her sabah 08:00 GİB sync log kaydı görünüyor
- [ ] 3 gün öncesinde WhatsApp gittiği gonderimler'de görünüyor

---

## 🟢 P3 — İyileştirme (Faz 2)

### P3-1 · Luca CSV Export
**Neden:** Luca muhasebe entegrasyonu MVP dışı ama CSV ile manuel aktarım mümkün.

**Yeni dosya:** `lib/reports/lucaExport.ts`

```ts
// Luca mahsup fişi CSV kolonları
["Tarih", "Belge No", "Hesap Kodu", "Açıklama", "Borç", "Alacak"]
```

**Kabul Kriteri:**
- [ ] Tahakkuklar sayfasında "Luca'ya Aktar" butonu
- [ ] İndirilen CSV Luca'ya import edilebilir

---

### P3-2 · Resmi Gazete AI Özeti (Claude API)
**Neden:** Dashboard'da `resmiGazeteOzetleri` UI'ı hazır ama veri manuel.

**Yeni dosya:** `app/api/resmi-gazete/ozetle/route.ts`

**Akış:**
1. Resmi Gazete RSS çek
2. Mali müşavirlikle ilgili maddeleri filtrele
3. `CLAUDE_API_KEY` ile özetle
4. `resmiGazeteOzetleri` koleksiyonuna yaz

**Gereksinim:** `CLAUDE_API_KEY` env var

**Kabul Kriteri:**
- [ ] Günlük cron'la otomatik çalışıyor
- [ ] Dashboard'da özetler görünüyor, aksiyonGerekiyor bayrağı işaret ediyor

---

### P3-3 · E-posta SMTP Gönderimi
**Neden:** Davet linkleri şu an manuel paylaşılıyor; rapor hazır bildirimi gitmiyor.

**Yeni dosya:** `app/api/email/send/route.ts`

**Gereksinim:** `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` env varlar

**Önce:** `DavetModal.tsx`'e "E-posta Gönder" toggle'ı

**Kabul Kriteri:**
- [ ] Davet oluşturulunca müşteriye e-posta gidiyor (davet linki içinde)
- [ ] Rapor hazırlandığında müşteriye bildirim gidiyor

---

## ✅ Bu Oturumda Tamamlananlar

| # | Özellik | Dosyalar |
|---|---------|---------|
| ✅ | Beyanname CRUD sayfası | `app/(musavir)/beyannameler/page.tsx` |
| ✅ | Yeni Beyanname modal | `components/modals/YeniBeyanameModal.tsx` |
| ✅ | Sidebar Beyannameler linki | `components/layout/Sidebar.tsx` |
| ✅ | GİB sync müşteri bazlı loop | `app/(musavir)/ayarlar/page.tsx` |
| ✅ | WhatsApp Meta Cloud API route | `app/api/whatsapp/send/route.ts` |
| ✅ | WhatsApp provider gerçek API | `lib/integrations/whatsapp/provider.ts` |
| ✅ | WhatsApp ayarlar paneli (düzenlenebilir) | `app/(musavir)/ayarlar/page.tsx` |
| ✅ | Select bileşeni children desteği | `components/ui/Input.tsx` |
| ✅ | Dashboard mini takvim | `components/ui/MiniTakvim.tsx` |
| ✅ | GİB şifreleme + API routes | `lib/integrations/gib/encrypt.ts` + `app/api/gib/` |
| ✅ | ErrorBoundary | `components/ui/ErrorBoundary.tsx` |
| ✅ | PageLoading tüm sayfalarda | `components/ui/PageLoading.tsx` |
| ✅ | Raporlar modal (müşteri/dönem/tür) | `app/(musavir)/raporlar/page.tsx` |
| ✅ | Banka ekstresi state güncellemesi | `app/(musavir)/tahakkuklar/page.tsx` |
| ✅ | Modal mobil bottom-sheet | `components/ui/Modal.tsx` |
| ✅ | CLAUDE.md proje spesifikasyonu | `CLAUDE.md` |

---

## Ortam Değişkeni Durum Tablosu

```
# Firebase (zorunlu)
NEXT_PUBLIC_FIREBASE_API_KEY           [ ] eksik
NEXT_PUBLIC_FIREBASE_PROJECT_ID        [ ] eksik
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET    [ ] eksik

# GİB şifreleme (zorunlu, min 32 karakter)
GIB_SECRET_KEY                         [ ] eksik

# WhatsApp (opsiyonel — yoksa simülasyon modu)
WHATSAPP_ACCESS_TOKEN                  [ ] eksik
WHATSAPP_PHONE_NUMBER_ID               [ ] eksik

# Faz 2
CLAUDE_API_KEY                         — henüz gerekmez
SMTP_HOST / SMTP_USER / SMTP_PASS      — henüz gerekmez
```
