"use client";

import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
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
  MOCK_MUSTERILER,
  MOCK_ODEMELER,
  MOCK_OFISLER,
  MOCK_RAPORLAR,
  MOCK_RESMI_GAZETE_OZETLERI,
  MOCK_TAHAKKUKLAR,
  MOCK_TAHSILATLAR,
  MOCK_TEBLIGATLAR,
} from "@/lib/data/mock";

export function useAppData() {
  const ofisler = useCollectionData(COLLECTIONS.ofisler, MOCK_OFISLER);
  const musteriler = useCollectionData(COLLECTIONS.musteriler, MOCK_MUSTERILER);
  const gorevler = useCollectionData(COLLECTIONS.gorevler, MOCK_GOREVLER);
  const tebligatlar = useCollectionData(COLLECTIONS.tebligatlar, MOCK_TEBLIGATLAR);
  const beyannameler = useCollectionData(COLLECTIONS.beyannameler, MOCK_BEYANNAMELER);
  const raporlar = useCollectionData(COLLECTIONS.raporlar, MOCK_RAPORLAR);
  const bildirimler = useCollectionData(COLLECTIONS.bildirimler, MOCK_BILDIRIMLER);
  const tahsilatlar = useCollectionData(COLLECTIONS.tahsilatlar, MOCK_TAHSILATLAR);
  const tahakkuklar = useCollectionData(COLLECTIONS.tahakkuklar, MOCK_TAHAKKUKLAR);
  const odemeler = useCollectionData(COLLECTIONS.odemeler, MOCK_ODEMELER);
  const davetler = useCollectionData(COLLECTIONS.davetler, MOCK_DAVETLER);
  const bankaEkstreleri = useCollectionData(COLLECTIONS.bankaEkstreleri, MOCK_BANKA_EKSTRELERI);
  const resmiGazeteOzetleri = useCollectionData(
    COLLECTIONS.resmiGazeteOzetleri,
    MOCK_RESMI_GAZETE_OZETLERI
  );
  const gibSyncLogs = useCollectionData(COLLECTIONS.gibSyncLogs, MOCK_GIB_SYNC_LOGS);
  const kdv2 = useCollectionData(COLLECTIONS.kdv2, MOCK_KDV2);
  const kullanicilar = useCollectionData(COLLECTIONS.kullanicilar, MOCK_KULLANICILAR);
  const gonderimler = useCollectionData(COLLECTIONS.gonderimler, MOCK_GONDERIMLER);
  const belgeler = useCollectionData(COLLECTIONS.belgeler, MOCK_BELGELER);
  const auditLogs = useCollectionData(COLLECTIONS.auditLogs, MOCK_AUDIT_LOGS);

  return {
    ofisler: ofisler.data,
    musteriler: musteriler.data,
    gorevler: gorevler.data,
    tebligatlar: tebligatlar.data,
    beyannameler: beyannameler.data,
    raporlar: raporlar.data,
    bildirimler: bildirimler.data,
    tahsilatlar: tahsilatlar.data,
    tahakkuklar: tahakkuklar.data,
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
    source: musteriler.source,
    loading:
      musteriler.loading ||
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
      auditLogs.loading,
  };
}
