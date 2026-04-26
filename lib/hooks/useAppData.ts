"use client";

import { COLLECTIONS } from "@/lib/firebase/firestore";
import { mergeDerivedVergiTahakkuklari } from "@/lib/domain/tahakkuk";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import {
  MOCK_AUDIT_LOGS,
  MOCK_BANKA_EKSTRELERI,
  MOCK_BEYANNAMELER,
  MOCK_BELGELER,
  MOCK_BILDIRIMLER,
  MOCK_DAVETLER,
  MOCK_GIB_SYNC_LOGS,
  MOCK_GOREVLER,
  MOCK_GONDERIMLER,
  MOCK_KDV2,
  MOCK_KULLANICILAR,
  MOCK_LUCA_ENTEGRASYON_AYARLARI,
  MOCK_MUSTERILER,
  MOCK_MUKELLEFIYET_PROFILLERI,
  MOCK_ODEMELER,
  MOCK_OFISLER,
  MOCK_RAPORLAR,
  MOCK_RESMI_GAZETE_OZETLERI,
  MOCK_TAHAKKUKLAR,
  MOCK_TAHSILATLAR,
  MOCK_TEBLIGATLAR,
  MOCK_WHATSAPP_ENTEGRASYON_AYARLARI,
  MOCK_YUKUMLULUKLER,
  MOCK_GIB_ENTEGRASYON_AYARLARI,
  MOCK_BANKA_ENTEGRASYON_AYARLARI,
  MOCK_EMAIL_ENTEGRASYON_AYARLARI,
  MOCK_ENTEGRASYON_LOGLARI,
  MOCK_NOTLAR,
} from "@/lib/data/mock";

export function useAppData() {
  const { user, loading: authLoading } = useAuth();
  // Firebase varsa auth çözülene ve kullanıcı girişi onaylanana kadar subscription başlatma
  const enabled = !isFirebaseConfigured || (!authLoading && !!user);
  // Çok-kiracılı izolasyon: tüm ofis-bazlı sorgular bu filtre ile daraltılır
  const ofisId = user?.ofisId;

  // ofisId filtresi OLMAYAN koleksiyonlar (global veya uid bazlı lookup)
  const ofisler = useCollectionData(COLLECTIONS.ofisler, MOCK_OFISLER, enabled);
  // ofisId filtreli — kendi ofisindeki kullanicilar ve davetler gorunsun
  const kullanicilar = useCollectionData(COLLECTIONS.kullanicilar, MOCK_KULLANICILAR, enabled, ofisId);
  const davetler = useCollectionData(COLLECTIONS.davetler, MOCK_DAVETLER, enabled, ofisId);

  // ofisId filtreli koleksiyonlar — farklı ofisler birbirinin verisini göremez
  const musteriler = useCollectionData(COLLECTIONS.musteriler, MOCK_MUSTERILER, enabled, ofisId);
  const mukellefiyetProfilleri = useCollectionData(
    COLLECTIONS.mukellefiyetProfilleri,
    MOCK_MUKELLEFIYET_PROFILLERI,
    enabled,
    ofisId
  );
  const yukumlulukler = useCollectionData(COLLECTIONS.yukumlulukler, MOCK_YUKUMLULUKLER, enabled, ofisId);
  const gorevler = useCollectionData(COLLECTIONS.gorevler, MOCK_GOREVLER, enabled, ofisId);
  const tebligatlar = useCollectionData(COLLECTIONS.tebligatlar, MOCK_TEBLIGATLAR, enabled, ofisId);
  const beyannameler = useCollectionData(COLLECTIONS.beyannameler, MOCK_BEYANNAMELER, enabled, ofisId);
  const raporlar = useCollectionData(COLLECTIONS.raporlar, MOCK_RAPORLAR, enabled, ofisId);
  const bildirimler = useCollectionData(COLLECTIONS.bildirimler, MOCK_BILDIRIMLER, enabled, ofisId);
  const tahsilatlar = useCollectionData(COLLECTIONS.tahsilatlar, MOCK_TAHSILATLAR, enabled, ofisId);
  const tahakkuklar = useCollectionData(COLLECTIONS.tahakkuklar, MOCK_TAHAKKUKLAR, enabled, ofisId);
  const odemeler = useCollectionData(COLLECTIONS.odemeler, MOCK_ODEMELER, enabled, ofisId);
  const bankaEkstreleri = useCollectionData(COLLECTIONS.bankaEkstreleri, MOCK_BANKA_EKSTRELERI, enabled, ofisId);
  const resmiGazeteOzetleri = useCollectionData(
    COLLECTIONS.resmiGazeteOzetleri,
    MOCK_RESMI_GAZETE_OZETLERI,
    enabled,
    ofisId
  );
  const gibSyncLogs = useCollectionData(COLLECTIONS.gibSyncLogs, MOCK_GIB_SYNC_LOGS, enabled, ofisId);
  const kdv2 = useCollectionData(COLLECTIONS.kdv2, MOCK_KDV2, enabled, ofisId);
  const gonderimler = useCollectionData(COLLECTIONS.gonderimler, MOCK_GONDERIMLER, enabled, ofisId);
  const belgeler = useCollectionData(COLLECTIONS.belgeler, MOCK_BELGELER, enabled, ofisId);
  const auditLogs = useCollectionData(COLLECTIONS.auditLogs, MOCK_AUDIT_LOGS, enabled, ofisId);
  const gibEntegrasyonAyarlari = useCollectionData(
    COLLECTIONS.gibEntegrasyonAyarlari,
    MOCK_GIB_ENTEGRASYON_AYARLARI,
    enabled,
    ofisId
  );
  const lucaEntegrasyonAyarlari = useCollectionData(
    COLLECTIONS.lucaEntegrasyonAyarlari,
    MOCK_LUCA_ENTEGRASYON_AYARLARI,
    enabled,
    ofisId
  );
  const whatsappEntegrasyonAyarlari = useCollectionData(
    COLLECTIONS.whatsappEntegrasyonAyarlari,
    MOCK_WHATSAPP_ENTEGRASYON_AYARLARI,
    enabled,
    ofisId
  );
  const bankaEntegrasyonAyarlari = useCollectionData(
    COLLECTIONS.bankaEntegrasyonAyarlari,
    MOCK_BANKA_ENTEGRASYON_AYARLARI,
    enabled,
    ofisId
  );
  const emailEntegrasyonAyarlari = useCollectionData(
    COLLECTIONS.emailEntegrasyonAyarlari,
    MOCK_EMAIL_ENTEGRASYON_AYARLARI,
    enabled,
    ofisId
  );
  const entegrasyonLoglari = useCollectionData(
    COLLECTIONS.entegrasyonLoglari,
    MOCK_ENTEGRASYON_LOGLARI,
    enabled,
    ofisId
  );
  const notlar = useCollectionData(COLLECTIONS.notlar, MOCK_NOTLAR, enabled, ofisId);
  const normalizedBeyannameler = beyannameler.data;
  const normalizedTahakkuklar = mergeDerivedVergiTahakkuklari(tahakkuklar.data, normalizedBeyannameler);

  return {
    ofisler: ofisler.data,
    musteriler: musteriler.data,
    mukellefiyetProfilleri:
      mukellefiyetProfilleri.data.length > 0
        ? mukellefiyetProfilleri.data
        : MOCK_MUKELLEFIYET_PROFILLERI,
    yukumlulukler: yukumlulukler.data.length > 0 ? yukumlulukler.data : MOCK_YUKUMLULUKLER,
    gorevler: gorevler.data,
    tebligatlar: tebligatlar.data,
    beyannameler: normalizedBeyannameler,
    raporlar: raporlar.data,
    bildirimler: bildirimler.data,
    tahsilatlar: tahsilatlar.data,
    tahakkuklar: normalizedTahakkuklar,
    odemeler: odemeler.data,
    davetler: davetler.data,
    bankaEkstreleri: bankaEkstreleri.data,
    resmiGazeteOzetleri: resmiGazeteOzetleri.data,
    gibSyncLogs: gibSyncLogs.data,
    kdv2: kdv2.data,
    kullanicilar: kullanicilar.data,
    gonderimler: gonderimler.data,
    belgeler: belgeler.data,
    auditLogs: auditLogs.data,
    gibEntegrasyonAyarlari: gibEntegrasyonAyarlari.data,
    lucaEntegrasyonAyarlari: lucaEntegrasyonAyarlari.data,
    whatsappEntegrasyonAyarlari: whatsappEntegrasyonAyarlari.data,
    bankaEntegrasyonAyarlari: bankaEntegrasyonAyarlari.data,
    emailEntegrasyonAyarlari: emailEntegrasyonAyarlari.data,
    entegrasyonLoglari: entegrasyonLoglari.data,
    notlar: notlar.data,
    source: musteriler.source,
    loading:
      musteriler.loading ||
      mukellefiyetProfilleri.loading ||
      yukumlulukler.loading ||
      ofisler.loading ||
      gorevler.loading ||
      tebligatlar.loading ||
      beyannameler.loading ||
      raporlar.loading ||
      bildirimler.loading ||
      tahsilatlar.loading ||
      tahakkuklar.loading ||
      odemeler.loading ||
      davetler.loading ||
      bankaEkstreleri.loading ||
      resmiGazeteOzetleri.loading ||
      gibSyncLogs.loading ||
      kdv2.loading ||
      kullanicilar.loading ||
      gonderimler.loading ||
      belgeler.loading ||
      auditLogs.loading ||
      gibEntegrasyonAyarlari.loading ||
      lucaEntegrasyonAyarlari.loading ||
      whatsappEntegrasyonAyarlari.loading ||
      bankaEntegrasyonAyarlari.loading ||
      emailEntegrasyonAyarlari.loading ||
      entegrasyonLoglari.loading,
  };
}
