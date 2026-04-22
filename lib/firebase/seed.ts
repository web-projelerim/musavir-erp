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
import { COLLECTIONS, seedCollection } from "@/lib/firebase/firestore";

export async function seedFirebaseMockData() {
  await Promise.all([
    seedCollection(COLLECTIONS.kullanicilar, MOCK_KULLANICILAR),
    seedCollection(COLLECTIONS.musteriler, MOCK_MUSTERILER),
    seedCollection(COLLECTIONS.gorevler, MOCK_GOREVLER),
    seedCollection(COLLECTIONS.tebligatlar, MOCK_TEBLIGATLAR),
    seedCollection(COLLECTIONS.beyannameler, MOCK_BEYANNAMELER),
    seedCollection(COLLECTIONS.raporlar, MOCK_RAPORLAR),
    seedCollection(COLLECTIONS.bildirimler, MOCK_BILDIRIMLER),
    seedCollection(COLLECTIONS.tahsilatlar, MOCK_TAHSILATLAR),
    seedCollection(COLLECTIONS.kdv2, MOCK_KDV2),
    seedCollection(COLLECTIONS.gonderimler, MOCK_GONDERIMLER),
    seedCollection(COLLECTIONS.belgeler, MOCK_BELGELER),
    seedCollection(COLLECTIONS.auditLogs, MOCK_AUDIT_LOGS),
  ]);
}
