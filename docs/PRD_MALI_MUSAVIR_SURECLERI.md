# MusavirERP PRD

## Belge Amaci

Bu belge, MusavirERP'yi genel bir ERP/demo panelinden cikarip gercek mali musavir ofisi operasyonlarini tasiyan bir "kontrol kulesi" urunune donusturmek icin urun gereksinimlerini tanimlar.

Bu PRD, 23 Nisan 2026 tarihinde mevcut repo durumu ile birlikte resmi ve birincil kaynaklar dikkate alinarak hazirlanmistir:

- GIB e-Beyanname SSS: https://intvrg.gib.gov.tr/sss_ebyn_tr.html?v=1.0.11
- Dijital Vergi Dairesi: https://dijital.gib.gov.tr/
- GIB e-Tebligat bilgilendirme materyali: https://ankara.gib.gov.tr/node/104442/pdf
- Luca urun sayfasi: https://www.luca.com.tr/Products/Index/5
- Luca urun brosuru: https://www.luca.com.tr/Upload/RWRSqbDW/QlpI/DoM159lsU0fRAie.pdf

## Urun Vizyonu

MusavirERP, Luca veya GIB yerine muhasebe ve resmi islem motoru olmaya calismayacak. Ana urun konumu:

- GIB, Luca ve ofis ici operasyonlardan gelen verileri birlestiren
- mali musavir ofisinin gunluk is yukunu gorunur hale getiren
- beyan, tebligat, tahakkuk, tahsilat ve belge sureclerini yoneten
- personel ve mukellef tarafini tek veri modeli uzerinden birlestiren
- uyum ve sure riskini erken tespit eden
- operasyonel "kontrol kulesi"

## Problem Tanimi

Mevcut sistemde musteri, gorev, beyanname, tahsilat, tebligat, tahakkuk ve bildirim ekranlari bulunuyor; ancak gercek mali musavir sureci icin asagidaki operasyonel eksikler var:

1. Sistem hangi mukellef icin hangi yukumlulugun hangi donemde dogacagini kendisi uretmiyor.
2. Beyanname sureci "bekliyor/verildi/gecikti" seviyesinde; hazirlama, kontrol, gonderim, tahakkuk ve odeme asamalari ayrismiyor.
3. E-tebligat sureci sadece bildirim izleme seviyesinde; son gun, hukuki agirlik ve aksiyon takibi yok.
4. Ofis hizmet tahakkuku ile resmi vergi tahakkuku birbirinden ayrismiyor.
5. Tahsilat sureci banka eslestirme baslangici yapiyor ama gercek mutabakat yetenegi sinirli.
6. Risk merkezi, gercek uyum riskleri yerine sinirli kural bazli sinyal uretiyor.

## Hedef Kullanicilar

### Birincil

- SMMM / YMM ofis sahibi
- sorumlu personel
- portfoy sorumlusu personel

### Ikincil

- mukellef / firma yetkilisi
- tahsilat takibi yapan idari personel

## Basari Olcutleri

Ilk 90 gunluk hedefler:

- beyanname son tarih kacirma oraninin azalmasi
- islenmemis tebligatlarin ortalama bekleme suresinin dusmesi
- ofis ucreti tahsilat eslestirme oraninin artmasi
- eksik belge nedeniyle bekleyen beyanname sayisinin azalmasi
- personel bazli is yukunun gorunur hale gelmesi
- mukellef portalinda goruntulenen tahakkuk ve belge oraninin artmasi

## Urun Ilkeleri

1. Resmi veri ile ofis verisini ayri tut, ama bagla.
2. Surec durumlarini yuzeysel degil, operasyonel asamalar halinde modelle.
3. Her kayit bir musteriye, bir ofise ve bir sorumluya bagli olsun.
4. Kullaniciya sadece bilgi degil, aksiyon sirasi ver.
5. AI sadece yardimci olsun; resmi yorum ve hukuki karar verici olmasin.

## Ana Moduller

### 1. Yukumluluk Motoru

Her musteri icin su sorularin cevabini sistemin kendisi uretmesi gerekir:

- Hangi beyanlar verilmek zorunda?
- Hangi periodlarda verilmek zorunda?
- Hangi belgeler onkosul?
- Hangi GIB veya Luca kaynaklariyla senkron edilmesi gerekir?
- Hangi vade ve risk kurallari uygulanir?

Beklenen cikti:

- musteri bazli yukumluluk profili
- aylik/haftalik is listesi
- otomatik beyan kaydi olusturma
- eksik belge talepleri

### 2. Beyanname Yasam Dongusu

Beyanname nesnesi su operasyonel asamalari takip etmelidir:

- planlandi
- evrak_bekliyor
- hazirlaniyor
- ic_kontrol
- musavir_onayi
- gonderildi
- onaylandi
- tahakkuk_olustu
- odeme_bekliyor
- kapandi
- duzeltme_gerekli
- iptal

Her asama zaman damgali ve sorumlu bazli izlenmelidir.

### 3. Tebligat Masasi

E-tebligatlar icin:

- ulasma tarihi
- teblig edilmis sayilma tarihi
- kritik son tarih
- tebligat tipi
- ilgili musteri
- ilgili surec (beyan, borc, ceza, inceleme, yoklama, yazi)
- aksiyon sahibi
- aksiyon sonucu

zorunlu tutulmalidir.

### 4. Tahakkuk ve Tahsilat

Iki ayri tahakkuk modeli bulunmalidir:

- ofis hizmet tahakkuku
- resmi vergi tahakkuku

Ofis hizmet tahakkugunda:

- hizmet donemi
- hizmet tipi
- liste ucreti
- indirim
- tahsil edilen
- kalan alacak
- odeme plani

Resmi vergi tahakkugunda:

- beyanname referansi
- tahakkuk fis numarasi
- vade
- vergi tutari
- odeme durumu

### 5. Banka Mutabakat Merkezi

Sistem:

- toplu banka dosyasi alabilmeli
- musteri bazli otomatik eslestirme yapabilmeli
- dusuk guvenli eslesmeleri onaya dusurebilmeli
- eslesmeyen hareketleri ayri kuyrukta gosterebilmeli
- kismi, fazla veya yanlis odemeyi ayri ele alabilmeli

### 6. Mukellef Portali

Mukellef paneli sadece goruntuleme degil, surec kolaylastirma amacli olmalidir:

- guncel tahakkuklar
- bekleyen belge talepleri
- gelen duyurular
- yuklenmis belgeler
- beyan sureci ozetleri
- odeme ve dekont yukleme

### 7. Personel ve Yetki

Personel yetkileri gorev bazli ve moduler olmalidir:

- portfoy goruntuleme
- musteri yazma
- belge yonetimi
- beyan hazirlama
- tahakkuk olusturma
- tahsilat onayi
- tebligat aksiyonu
- entegrasyon goruntuleme

### 8. Resmi Gazete ve AI Destek

AI kullaniminin alani sinirli olmali:

- Resmi Gazete ozetleme
- tebligat on-siniflandirma
- eksik belge ozetleme
- banka eslestirme aciklamasi

AI hicbir zaman:

- hukuki yorumun son merci olmamali
- otomatik resmi karar vermemeli

## Kullanici Hikayeleri

### Mali Musavir

- Portfoyumde bu hafta hangi beyannameler var gormek istiyorum.
- Yeni gelen e-tebligatlardan kritik olanlari hemen ayirmak istiyorum.
- Hangi musteri ucret odemedi ve ne kadar gecikti gormek istiyorum.
- Personelimin uzerindeki acik isleri ve gecikenleri tek ekranda gormek istiyorum.

### Personel

- Bana atanmis beyannameleri ve eksik evraklari tek kuyrukta gormek istiyorum.
- Bir musteri icin hangi belgelerin hala eksik oldugunu bilmek istiyorum.
- Tebligat geldiginde ne yapacagimi sistemin yonlendirmesini istiyorum.

### Mukellef

- Benden ne beklendigini sade bir sekilde gormek istiyorum.
- Hangi tahakkuklarin guncel oldugunu ve odeme durumumu bilmek istiyorum.
- Eksik evrak varsa tek tikla yuklemek istiyorum.

## Kapsam Disi

Su asamada urunun birinci hedefi olmayan alanlar:

- genel muhasebe fis kaydi motoru
- e-defter olusturma motori
- tam kapsamli bordro motoru
- resmi sistemler yerine gecen screen scraping tabanli otomasyon

## Fazlandirma

### Faz 1

- yukumluluk profili
- beyanname yasam dongusu
- tebligat masasi
- hizmet tahakkuku ve tahsilat merkezi

### Faz 2

- resmi vergi tahakkugu takibi
- banka mutabakat olgunlastirma
- personel is yuk dengesi
- mukellef portal derinlestirme

### Faz 3

- Luca ve GIB entegrasyon adapterlari
- Resmi Gazete ve AI destekli siniflandirma
- gelismis risk ve SLA raporlama

## Cikis Karari

Bu PRD'nin sonucunda MusavirERP'nin bir sonraki asamadaki odagi su olacaktir:

- ilk teknik uygulama hedefi: yukumluluk motoru ve beyan yasam dongusu
- ikinci hedef: tebligat SLA merkezi
- ucuncu hedef: tahakkuk/tahsilat mutabakat motoru
