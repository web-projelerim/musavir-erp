# Claude Yönlendirme Dosyası

**Konu:** Mali müşavir - mükellef otomasyon, raporlama ve resmi veri odaklı SaaS paneli

**Amaç:** Claude'un projeyi geliştirirken kapsamı, mimariyi, ekranları, entegrasyon yaklaşımını ve kod değişikliği kurallarını bozmayacak şekilde yönlendirilmesi.

**Ana ilke:** Her düzenleme hedefli, izole, geri alınabilir ve test edilebilir olmalı. Bir modülü iyileştirirken başka bir modül bozulmamalı.

## 1. Ürün özeti ve stratejik çerçeve

### Ürün tanımı
Mali müşavirler için geliştirilen bu sistem; müşteri yönetimi, görev takibi, resmi veri temelli kontrol, raporlama, WhatsApp iletişimi ve müşteri/müşavir panel yapısını tek platformda birleştiren modern web panelidir. Sistem hem müşavir ofisinin iç operasyonunu hem de mükellef ile dış iletişimi aynı omurga üzerinde yönetmelidir.

### Temel değer önerisi
Tek ekranda tüm müşterileri görmek, GİB ve Luca kaynaklı resmi verilerle durumu takip etmek, yaklaşan yükümlülükleri kaçırmamak, otomatik rapor üretmek, toplu iletişim kurmak ve riskli müşterileri erken fark etmektir.

### MVP yaklaşımı
Bu ürün ilk günden her şeyi çözmeye çalışmamalıdır. MVP; çekirdek iş akışlarını güvenilir ve profesyonel şekilde çalıştırmalı, sonraki sürümler aynı mimariyi büyütmelidir. Bu nedenle ilk sürümde modüler yapı, temiz veri modeli, roller, bildirim altyapısı ve ekran omurgası doğru kurulmalıdır.

## 2. Kullanıcı rolleri

### Mali müşavir
Tüm müşteri portföyünü görür, görev oluşturur veya atar, raporları inceler, toplu gönderim yapar, resmi verileri kontrol eder, müşteri bazlı riskleri takip eder.

### Personel
Kendisine atanmış işleri ve müşterileri görür, görev durumu günceller, belge ve rapor yönetimine katkı verir. Yetkileri rol bazlı sınırlandırılmalıdır.

### Mükellef
Sadece kendi firmasına ait paneli görür. Beyanname durumu, tebligatlar, otomatik raporlar, gönderilen belgeler, tahsilat durumu ve duyurulara erişir.

## 3. Ürünün çekirdek modülleri

### 3.1 Tek ekran müşteri kontrol merkezi
Tüm müşterilerin tek tablo veya kart tabanlı ana görünümde izlendiği ana ekrandır. Bu ekranda en az şu alanlar bulunmalıdır: firma adı, VKN/TCKN, son durum, yaklaşan beyanname, son tebligat, görev durumu, risk skoru, ödeme/tahsilat durumu, rapor gönderim durumu, son veri güncelleme zamanı.

### 3.2 Müşavir paneli
Müşteri listesi, görev yönetimi, resmi veri kontrolleri, toplu aksiyonlar, rapor üretim ekranları, gönderim geçmişi, takvim, filtreler, kullanıcı/rol yönetimi ve sistem ayarlarını içerir.

### 3.3 Mükellef paneli
Kendi firma özeti, yaklaşan işlemler, son gönderilen raporlar, tebligatlar, dosyalar, mesajlar, ödeme/tahsilat bilgileri ve duyuruları gösterir. Basit ve güven veren bir tasarım tercih edilmelidir.

### 3.4 Görev sistemi
Görev oluşturma, görev atama, termin tarihi, öncelik, durum takibi, görev geçmişi, görev notları, görev ekranı filtreleme ve otomatik görev üretimi desteklenmelidir. Örnek görevler: KDV beyannamesi hazırla, kontrol et, müşteriden belge iste, tebligat incele, tahsilat hatırlatması yap.

### 3.5 Otomatik raporlama
Sistem, müşteri bazlı periyodik veya tetiklemeli raporlar üretmelidir. Bu raporlar panelde görüntülenmeli, PDF olarak saklanmalı ve WhatsApp veya e-posta ile gönderilebilmelidir. İlk sürümde gelir-gider özeti, vergi/beyan durumu ve genel operasyon özeti yeterlidir.

### 3.6 WhatsApp toplu gönderim
Site üzerinde üretilen raporların ve duyuruların müşterilere arka planda, şablonlara bağlı şekilde gönderilmesi gerekir. Tekli ve toplu gönderim desteklenmelidir. Gönderim geçmişi, teslim durumu ve başarısız gönderimler kaydedilmelidir.

### 3.7 E-tebligat ve resmi bildirim takibi
GİB kaynaklı tebligatların varlığı, tarihi, okunma/işlenme durumu ve PDF erişimi izlenmelidir. Tek müşteri ekranında da toplu müşteri görünümünde de tebligat bilgisi görünmelidir.

### 3.8 Beyanname ve yükümlülük takibi
Müşteri bazlı hangi beyanların ne zaman verilmesi gerektiği, verildi/verilmedi durumu, son tarih yaklaşımı ve ilgili personel sorumluluğu izlenmelidir.

### 3.9 KDV2 hesaplama modülü
Belirli hizmet/fatura tiplerinde KDV2 hesaplamasını destekleyen, resmi mantığa göre çalışan ve mümkün olduğunda resmi veriler veya muhasebe kayıtlarıyla eşleşebilen modül olmalıdır. Girdi, form tabanlı veya Luca/GİB verisinden türetilmiş olabilir.

### 3.10 Tahsilat ve ödeme takibi
Müşavir ücret tahsilatı, müşteri ödeme durumu, ödeme hatırlatma, ödeme geçmişi ve gerekiyorsa fatura/tahsilat eşleştirmesi yapılmalıdır.

### 3.11 Risk skoru
Sistem müşteri bazlı risk seviyesini görünür kılmalıdır. Bu skor; gecikmiş beyanlar, yeni tebligatlar, ödeme gecikmeleri, veri tutarsızlıkları, eksik belge, KDV2 uyumsuzluğu veya kritik işlem beklemeleri gibi sinyallerden türetilmelidir. İlk sürümde kural bazlı skor yeterlidir.

## 4. Resmi veri ilkesi: GİB ve Luca odaklı mimari

### Ana prensip
Sistem mümkün olan her yerde resmi veya operasyonel ana kaynaktan beslenmelidir. Yani müşteri, beyan, tebligat, vergi ve belirli kayıtlar için GİB/Luca verisi birincil kaynak olarak düşünülmelidir. Manuel veri girişi sadece istisna, düzeltme veya geçici fallback olarak kalmalıdır.

### GİB tarafında hedeflenen veri alanları
E-tebligat var/yok bilgisi, tebligat tarihi, tebligat PDF erişimi, beyan durumları, vergi ile ilişkili görünür göstergeler, kullanıcı bazlı resmi ekranlardan çekilebilecek durum bilgileri.

### Luca tarafında hedeflenen veri alanları
Müşteri listesi, firma temel bilgileri, finansal özet alanları, gelir-gidere temel teşkil eden kayıtlar, fatura ve muhasebe akışına yardımcı olacak veri yapıları, beyan veya rapor üretimine yardımcı olan kayıtlar.

### Veri kaynağı hiyerarşisi
Bir veri için aynı anda birden fazla kaynak varsa öncelik sırası tanımlanmalıdır. Örnek yaklaşım: resmi kaynak > entegre operasyon kaynağı > kullanıcı onaylı manuel kayıt > ham kullanıcı girişi.

### Önemli mimari not
Claude entegrasyon katmanını iş mantığından ayırmalıdır. GİB veya Luca bağlantısı değişse bile ekranlar ve çekirdek uygulama mantığı mümkün olduğunca bozulmamalıdır. Bunun için adapter veya provider tabanlı entegrasyon tasarımı tercih edilmelidir.

## 5. MVP kapsamı ve fazlama

### MVP'de mutlaka bulunacaklar
Kimlik doğrulama, rol bazlı panel ayrımı, tek ekran müşteri kontrol merkezi, görev sistemi, temel raporlama, toplu WhatsApp gönderim altyapısı, müşteri/müşavir dosya paylaşımı, beyan ve tebligat görünümü için veri modeli, KDV2 hesaplama ekranı, risk skoru alanı, entegrasyona hazır veri altyapısı.

### MVP'de kısmen veya hazırlıklı bırakılacaklar
GİB/Luca tam entegrasyon akışları, gelişmiş risk motoru, banka PDF eşleştirme, otomatik ceza/risk tahminleri, derin finans analitiği.

### Sonraki sürümler
Otomatik resmi veri senkronizasyonu, gelişmiş görev otomasyonu, çok kanallı bildirim merkezi, analitik dashboard, tahsilat ve banka entegrasyonları, gelişmiş kural motoru, müşteri segmentasyonu.

## 6. Modern panel beklentisi

### Tasarım karakteri
Arayüz modern, sade, profesyonel ve kurumsal güven duygusu veren bir yapıda olmalıdır. Finansal/yasal operasyon paneli olduğu için gösterişli değil temiz ve kontrollü görünmelidir.

### UI prensipleri
Bol beyaz alan, net tipografi, sakin renk kullanımı, yüksek okunabilirlik, durum renklerinde tutarlılık, kritik öğelerde görsel öncelik, tekrarlı kart ve tablo dili, karanlık mod gerekliyse ileride düşünülmelidir ama MVP için önce açık tema kusursuz olmalıdır.

### Kırmızı çizgiler
Farklı sayfalarda birbirini bozan stiller kullanılmamalı, rastgele component library karışımı yapılmamalı, bir sayfadaki düzenleme diğer sayfaların spacing veya state akışını bozmamalıdır.

## 7. Claude için mimari ve kod organizasyonu kuralları

### Modülerlik zorunluluğu
Claude her modülü izole tasarlamalıdır. Müşteri yönetimi, görev sistemi, raporlama, entegrasyon, bildirim ve kimlik doğrulama ayrı klasörler veya domainler halinde ilerlemelidir.

### Katman ayrımı
UI katmanı, uygulama servisleri, domain mantığı, veri erişimi ve entegrasyon katmanı ayrılmalıdır. Örneğin ekran component'leri içinde doğrudan entegrasyon kodu veya ağır iş mantığı bulunmamalıdır.

### Tek değişiklik - tek etki ilkesi
Claude bir özelliği güncellerken sadece ilgili domain dosyalarına müdahale etmelidir. Ortak component veya temel layout dosyalarını değiştirecekse bunun etki alanını açıkça belirtmeli ve diğer ekranlarda kırılma oluşturmayacak şekilde ilerlemelidir.

### Refactor kuralı
Geniş refactor ancak gerçekten zorunluysa yapılmalıdır. Zorunlu değilse mevcut çalışan parçaları bozmadan hedefli iyileştirme tercih edilmelidir.

### Geri alınabilir geliştirme
Her büyük değişiklik küçük ve mantıklı parçalara ayrılmalı; commit mantığında ilerlemeli; mümkünse feature flag veya ayrı route üzerinden test edilerek ana sisteme alınmalıdır.

### Tip güvenliği ve sözleşmeler
Frontend ve backend arasında tip/sözleşme bazlı çalışma olmalıdır. Veri objeleri gelişi güzel kullanılmamalı; DTO, schema veya interface'ler merkezi şekilde tanımlanmalıdır.

### State yönetimi
Global state yalnızca gerçekten global olan alanlarda kullanılmalıdır. Sayfa içi state lokal tutulmalı; gereksiz global bağımlılık oluşturulmamalıdır.

### Tasarım sistemi
Buton, tablo, modal, badge, filtre barı, metric card, stat widget, timeline, attachment list, form field gibi ortak yapılar component system olarak tasarlanmalı; her sayfada yeniden yazılmamalıdır.

## 8. Claude için değişiklik güvenlik protokolü

### Her görevden önce
Claude önce ilgili modülü ve etki alanını analiz etmeli; hangi dosyalara dokunacağını kısa şekilde listelemeli; değişikliğin mevcut akışları nasıl etkileyeceğini belirtmelidir.

### Her görev sırasında
Mevcut çalışan kodu gereksiz yere taşımamalı, isimleri rastgele değiştirmemeli, unrelated dosyaları formatlamamalı, stil veya state mantığını geniş kapsamlı kırmamalıdır.

### Her görevden sonra
Değişen ekranı, ilişkili akışları ve ortak component etkilerini kontrol etmeli; hataya açık noktaları belirtmeli; gerekiyorsa smoke test adımları önermelidir.

### Yasak davranışlar
Çalışan sistemi komple yeniden yazmak, tüm klasörleri yeniden organize etmek, kullanılan component'leri rastgele silmek, veri modellerini tüm projeyi etkileyen biçimde habersiz değiştirmek, sessizce API sözleşmesi kırmak.

## 9. Teknik omurga önerisi

### Frontend
Next.js veya React tabanlı, modüler klasör yapısına sahip, profesyonel admin panel deneyimi veren bir yapı. Component library kontrollü seçilmeli; tek tasarım sistemi uygulanmalıdır.

### Backend
FastAPI veya benzeri güçlü API çatısı. Domain servisleri net ayrılmalı. Kimlik doğrulama, müşteri yönetimi, görevler, raporlar, entegrasyonlar ve bildirimler ayrı modüller olmalıdır.

### Veritabanı
İlişkisel veritabanı tercih edilmelidir. Müşteri, kullanıcı, görev, rapor, tebligat, beyan, gönderim, risk olayı, veri senkronizasyon kaydı ve entegrasyon oturumları için temiz tablo yapıları kurulmalıdır.

### Arka plan işleri
Rapor üretimi, WhatsApp gönderimi, senkronizasyon, resmi veri çekme ve skorlama işlemleri queue/worker mantığında çalışmalıdır. Uzun süren işler UI isteği içinde bloklanmamalıdır.

### Denetim izi
Kritik alanlarda audit log olmalıdır. Kim neyi güncelledi, rapor ne zaman üretildi, mesaj ne zaman gönderildi, bir görevin durumu ne zaman değişti görülebilmelidir.

## 10. Ekran listesi

### Giriş ve kimlik doğrulama
Güvenli giriş, şifre yenileme, rol bazlı yönlendirme, oturum yönetimi.

### Ana dashboard
Toplam müşteri, bugün kritik olanlar, bekleyen görevler, yeni tebligatlar, yaklaşan beyanlar, gönderilecek raporlar, yüksek riskli firmalar.

### Müşteri listesi / tek ekran
Gelişmiş filtreli müşteri görünümü; tablo ve kart geçişi; kritik durum rozetleri; toplu aksiyonlar.

### Müşteri detay sayfası
Genel özet, belgeler, tebligatlar, beyannameler, görevler, raporlar, iletişim geçmişi, tahsilat ve risk geçmişi sekmeleri.

### Görev ekranı
Kanban + tablo görünümü; sorumlu kişi, termin, öncelik, müşteri ve durum filtreleri.

### Rapor merkezi
Şablonlar, üretilen raporlar, gönderim durumları, toplu işlem alanları.

### Tebligat ve beyan ekranı
Tüm müşteriler çapında resmi bildirim ve beyan takibi.

### Risk merkezi
Müşteri bazlı skor, skora etki eden sinyaller, uyarılar ve açıklamalar.

### Ayarlar
Kullanıcılar, roller, bildirim ayarları, entegrasyon ayarları, sistem tercihleri.

### Mükellef paneli
Kendi firma özeti, yaklaşan işlemler, son raporlar, belgeler, duyurular ve müşavirden gelen iletişimler.

## 11. Kural bazlı risk skoru taslağı

### Amaç
Risk skoru bir yapay zekâ gösterisi değil, operasyon önceliklendirme aracıdır. İlk sürümde açık kurallar üzerinden hesaplanmalıdır.

### Olası risk sinyalleri
Geciken beyan, işlenmemiş tebligat, eksik belge, ödenmemiş müşavir ücreti, tekrar eden görev gecikmesi, KDV2 kontrol uyumsuzluğu, resmi veri senkronizasyon hatası.

### Skor açıklanabilir olmalı
Claude skorun neden yükseldiğini kullanıcıya gösterecek açıklama bileşenleri tasarlamalıdır. Sadece sayı vermek yeterli değildir.

## 12. KDV2 hesaplama modülü beklentisi

### Modül amacı
Operasyon ekibine veya müşavire hızlı, kontrollü ve takip edilebilir bir KDV2 hesap ekranı sunmak.

### MVP davranışı
Girdi alanları açık, hesap mantığı izlenebilir, kayıt altına alınabilir ve müşteri bazlı ilişkilendirilebilir olmalıdır.

### Gelişmiş sürüm hazırlığı
Luca veya diğer kayıtlarla bağlanabilecek veri modeli bırakılmalı; ancak MVP ekranı manuel kullanımda da temiz çalışmalıdır.

## 13. Bildirim ve iletişim mimarisi

### Kanallar
WhatsApp birincil kanal olabilir; e-posta ve uygulama içi bildirim ikinci katmanda hazır tutulmalıdır.

### Bildirim tipleri
Yaklaşan beyanname, yeni tebligat, görev ataması, rapor hazırlandı, tahsilat hatırlatma, sistem duyurusu.

### Gönderim kayıtları
Her bildirim loglanmalı; başarısız/başarılı durumu, deneme sayısı ve içerik referansı tutulmalıdır.

## 14. Güvenlik ve yetkilendirme

### Rol bazlı erişim
Her kullanıcı sadece yetkili olduğu müşteri, görev ve aksiyonları görmelidir.

### Hassas veri yaklaşımı
Vergi, beyan, tebligat, müşteri finans ve iletişim verileri hassastır. Gereksiz görünürlük, debug çıktısı veya client-side aşırı veri taşınması olmamalıdır.

### Oturum ve entegrasyon güvenliği
Entegrasyon kimlik bilgileri güvenli saklanmalı, erişim günlükleri tutulmalı, kritik işlemlerde audit izi bırakılmalıdır.

## 15. Test ve kalite beklentileri

### Minimum kalite standardı
Her yeni modül için en azından temel smoke test senaryoları belirlenmeli: giriş, listeleme, detay açma, kayıt oluşturma, düzenleme, gönderim, hata durumları.

### UI regresyon kontrolü
Claude ortak component değiştiriyorsa ilgili ekranlarda görsel bozulma riskini kontrol etmelidir.

### API ve veri sözleşmesi kontrolü
Yeni alan eklendiğinde eski ekranları bozmayacak şekilde geriye uyumluluk düşünülmelidir.

## 16. Claude'a verilecek çalışma talimatı

### Claude'un rolü
Sen bu projede kıdemli full-stack ürün mühendisi ve tasarım sistemine duyarlı SaaS mimarısın. Hedefin hızlı değil güvenilir, modern ve sürdürülebilir ilerlemek.

### Claude'dan beklenen davranış
Önce analiz yap, sonra kapsamı netleştir, sonra küçük ve güvenli parçalara bölerek uygula. Mevcut çalışan alanları bozma. Etki alanını açıkça belirt. Değişiklikleri modüler ve okunabilir yaz.

### Claude'un her cevapta uyması gereken şablon
1) Dokunacağın dosyalar 2) Neden bu dosyalar 3) Değişiklik planı 4) Olası riskler 5) Uygulama 6) Kontrol adımları.

## 17. Claude için hazır ana prompt

### Kullanıma hazır metin
Bu proje mali müşavirler ve mükellefler için geliştirilen modern bir SaaS panelidir. Üründe müşavir paneli, mükellef paneli, tek ekran müşteri kontrol merkezi, görev sistemi, resmi veri odaklı GİB/Luca entegrasyon omurgası, otomatik raporlama, WhatsApp toplu gönderim, tebligat ve beyan takibi, KDV2 hesaplama ve risk skoru vardır. Sen bu projede çalışan modülleri bozmadan, modüler, test edilebilir ve profesyonel bir mimariyle ilerlemelisin. Bir alanı düzenlerken başka alanları etkilememelisin. Geniş refactor yapma; önce etki alanını analiz et, sonra sadece gerekli dosyalara dokun. Ortak component değiştiriyorsan bunun diğer ekranlara etkisini kontrol et. UI modern, kurumsal ve tutarlı olmalı. Her görevde önce hangi dosyalara neden dokunacağını açıkla, sonra adım adım uygula, en sonda olası riskleri ve kontrol senaryolarını ver. Eğer bir bilgi eksikse varsayımı açıkça belirt ama yapıyı bozacak tahminlerde bulunma. Amaç hızlı yamalar değil, uzun ömürlü ürün omurgası kurmaktır.

## 18. Claude için görev öncesi kısa kontrol listesi

1. **Hangi modülü değiştiriyorum?** - Tek domain belirle; tüm projeye yayılma.
2. **Hangi dosyalara dokunacağım?** - Listele ve gereksiz dosya ekleme.
3. **Bu değişiklik ortak component etkiliyor mu?** - Evetse diğer ekranları kontrol et.
4. **API sözleşmesi değişiyor mu?** - Geriye uyumluluğu koru veya açıkça belirt.
5. **UI tutarlılığı korunuyor mu?** - Spacing, tipografi, badge ve tablo dili bozulmamalı.
6. **Test senaryosu ne?** - En az giriş, liste, detay, kaydet, hata durumları düşünülmeli.

## 19. Son not

Bu dosya ürünün nihai teknik şartnamesi değil, **Claude için yön verici ana çerçevedir**. Geliştirme ilerledikçe ekran akışları, veri modeli, entegrasyon detayları ve rol matrisi ayrı teknik dökümanlar halinde genişletilmelidir.