# MusavirERP - Gelistirme Notlari

Tarih: 2026-04-22

## Lokal Dev Server

Uygulamayi lokal gelistirme icin 3100 portunda calistir:

```bash
npm run dev:3100
```

Build komutu calistirildiktan sonra dev server kullanilacaksa temiz baslatma komutunu kullan:

```bash
npm run dev:clean
```

Bu komut `.next` klasorunu temizleyip Next.js dev server'i `http://localhost:3100` adresinde yeniden acar.

## Neden `dev:clean` Var?

`npm run build` production asset manifestleri uretir. Ayni `.next` klasoru uzerinden dev server devam ederse tarayici `/_next/static/...` altindaki dev chunk adlarini isteyebilir ve CSS/JS dosyalari 404 donebilir.

Belirti:

- Sayfa Tailwind stilleri olmadan duz HTML gibi gorunur.
- Console'da `layout.css`, `main-app.js`, `app-pages-internals.js` veya `app/layout.js` icin 404 hatasi gorunur.

Cozum:

1. Dev server'i kapat.
2. `.next` klasorunu temizle.
3. `npm run dev:clean` calistir.
4. Tarayicida gerekirse `Ctrl+F5` ile sert yenileme yap.

## Smoke Kontrol Listesi

- [ ] `http://localhost:3100/giris`
- [ ] `http://localhost:3100/dashboard`
- [ ] `http://localhost:3100/musteriler`
- [ ] `http://localhost:3100/gorevler`
- [ ] `http://localhost:3100/tebligatlar`
- [ ] `http://localhost:3100/raporlar`
- [ ] `http://localhost:3100/risk`
- [ ] `http://localhost:3100/kdv2`
- [ ] `http://localhost:3100/ayarlar`
- [ ] `http://localhost:3100/panel`

Statik asset kontrolleri:

- [ ] `/_next/static/css/app/layout.css`
- [ ] `/_next/static/chunks/main-app.js`
- [ ] `/_next/static/chunks/app-pages-internals.js`
- [ ] `/_next/static/chunks/app/layout.js`
- [ ] `/favicon.ico`
- [ ] `/favicon.svg`
