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
  MOCK_TAHSILATLAR,
  MOCK_TEBLIGATLAR,
} from "@/lib/data/mock";
import { COLLECTIONS, seedCollection } from "@/lib/firebase/firestore";

export async function seedFirebaseMockData() {
  await Promise.all([
    seedCollection(COLLECTIONS.ofisler, MOCK_OFISLER),
    seedCollection(COLLECTIONS.kullanicilar, MOCK_KULLANICILAR),
    seedCollection(COLLECTIONS.musteriler, MOCK_MUSTERILER),
    seedCollection(COLLECTIONS.gorevler, MOCK_GOREVLER),
    seedCollection(COLLECTIONS.tebligatlar, MOCK_TEBLIGATLAR),
    seedCollection(COLLECTIONS.beyannameler, MOCK_BEYANNAMELER),
    seedCollection(COLLECTIONS.raporlar, MOCK_RAPORLAR),
    seedCollection(COLLECTIONS.bildirimler, MOCK_BILDIRIMLER),
    seedCollection(COLLECTIONS.tahsilatlar, MOCK_TAHSILATLAR),
    seedCollection(COLLECTIONS.odemeler, MOCK_ODEMELER),
    seedCollection(COLLECTIONS.davetler, MOCK_DAVETLER),
    seedCollection(COLLECTIONS.bankaEkstreleri, MOCK_BANKA_EKSTRELERI),
    seedCollection(COLLECTIONS.resmiGazeteOzetleri, MOCK_RESMI_GAZETE_OZETLERI),
    seedCollection(COLLECTIONS.gibSyncLogs, MOCK_GIB_SYNC_LOGS),
    seedCollection(COLLECTIONS.kdv2, MOCK_KDV2),
    seedCollection(COLLECTIONS.gonderimler, MOCK_GONDERIMLER),
    seedCollection(COLLECTIONS.belgeler, MOCK_BELGELER),
    seedCollection(COLLECTIONS.auditLogs, MOCK_AUDIT_LOGS),
  ]);
}
