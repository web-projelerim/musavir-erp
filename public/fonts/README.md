# PDF Fontları

Bu klasöre **Roboto-Regular.ttf** dosyasını eklemeniz gerekiyor.

## İndirme

1. https://fonts.google.com/specimen/Roboto adresine gidin
2. "Get font" → "Download all" ile zip indir
3. Zip içinden **static/Roboto-Regular.ttf** dosyasını çıkar
4. Bu klasöre `Roboto-Regular.ttf` adıyla yerleştir

## Neden gerekli?

jsPDF'in varsayılan Helvetica fontu Türkçe karakterlerden `ş, ğ, ı, İ` desteklemez.
Roboto TTF embed edilince PDF raporlarda tüm Türkçe karakterler düzgün görünür.

## Dosya yoksa

Sistem otomatik olarak Helvetica'ya fallback yapar ve `ş→s`, `ğ→g`, `ı→i` normalize eder.
Console'da uyarı log'lanır.

## Boyut

Roboto-Regular.ttf yaklaşık 168KB. İlk PDF üretildiğinde yüklenip belleğe alınır,
sonraki üretimler anında çalışır.
