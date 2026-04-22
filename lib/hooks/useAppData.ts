"use client";

import { COLLECTIONS } from "@/lib/firebase/firestore";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
import {
  MOCK_AUDIT_LOGS,
  MOCK_BEYANNAMELER,
  MOCK_BELGELER,
  MOCK_BILDIRIMLER,
  MOCK_GOREVLER,
  MOCK_GONDERIMLER,
  MOCK_KDV2,
  MOCK_KULLANICILAR,
  MOCK_MUSTERILER,
  MOCK_RAPORLAR,
  MOCK_TAHSILATLAR,
  MOCK_TEBLIGATLAR,
} from "@/lib/data/mock";

export function useAppData() {
  const musteriler = useCollectionData(COLLECTIONS.musteriler, MOCK_MUSTERILER);
  const gorevler = useCollectionData(COLLECTIONS.gorevler, MOCK_GOREVLER);
  const tebligatlar = useCollectionData(COLLECTIONS.tebligatlar, MOCK_TEBLIGATLAR);
  const beyannameler = useCollectionData(COLLECTIONS.beyannameler, MOCK_BEYANNAMELER);
  const raporlar = useCollectionData(COLLECTIONS.raporlar, MOCK_RAPORLAR);
  const bildirimler = useCollectionData(COLLECTIONS.bildirimler, MOCK_BILDIRIMLER);
  const tahsilatlar = useCollectionData(COLLECTIONS.tahsilatlar, MOCK_TAHSILATLAR);
  const kdv2 = useCollectionData(COLLECTIONS.kdv2, MOCK_KDV2);
  const kullanicilar = useCollectionData(COLLECTIONS.kullanicilar, MOCK_KULLANICILAR);
  const gonderimler = useCollectionData(COLLECTIONS.gonderimler, MOCK_GONDERIMLER);
  const belgeler = useCollectionData(COLLECTIONS.belgeler, MOCK_BELGELER);
  const auditLogs = useCollectionData(COLLECTIONS.auditLogs, MOCK_AUDIT_LOGS);

  return {
    musteriler: musteriler.data,
    gorevler: gorevler.data,
    tebligatlar: tebligatlar.data,
    beyannameler: beyannameler.data,
    raporlar: raporlar.data,
    bildirimler: bildirimler.data,
    tahsilatlar: tahsilatlar.data,
    kdv2: kdv2.data,
    kullanicilar: kullanicilar.data,
    gonderimler: gonderimler.data,
    belgeler: belgeler.data,
    auditLogs: auditLogs.data,
    source: musteriler.source,
    loading:
      musteriler.loading ||
      gorevler.loading ||
      tebligatlar.loading ||
      beyannameler.loading ||
      raporlar.loading ||
      bildirimler.loading ||
      tahsilatlar.loading ||
      kdv2.loading ||
      kullanicilar.loading ||
      gonderimler.loading ||
      belgeler.loading ||
      auditLogs.loading,
  };
}
