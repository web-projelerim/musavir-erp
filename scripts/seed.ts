/**
 * Firebase seed script — mevcut mock verileri Firestore'a yükler
 * Çalıştırmak için: npx ts-node --project tsconfig.seed.json scripts/seed.ts
 *
 * NOT: Bu script'i çalıştırmadan önce .env.local dosyasındaki Firebase
 * değerlerini ayarlayın ve SERVICE_ACCOUNT_KEY_PATH'ı doğru yapılandırın.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  MOCK_MUSTERILER,
  MOCK_GOREVLER,
  MOCK_TEBLIGATLAR,
  MOCK_BEYANNAMELER,
  MOCK_RAPORLAR,
  MOCK_TAHSILATLAR,
  MOCK_KDV2,
  MOCK_BILDIRIMLER,
} from "../lib/data/mock";

const serviceAccount = require(process.env.SERVICE_ACCOUNT_KEY_PATH || "./service-account.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function seedCollection<T extends { id: string }>(
  colName: string,
  items: T[]
): Promise<void> {
  const batch = db.batch();
  items.forEach((item) => {
    const { id, ...data } = item;
    batch.set(db.collection(colName).doc(id), data);
  });
  await batch.commit();
  console.log(`✓ ${colName}: ${items.length} kayıt yüklendi`);
}

async function main() {
  console.log("🚀 Firestore seed başlıyor...\n");

  await seedCollection("musteriler", MOCK_MUSTERILER);
  await seedCollection("gorevler", MOCK_GOREVLER);
  await seedCollection("tebligatlar", MOCK_TEBLIGATLAR);
  await seedCollection("beyannameler", MOCK_BEYANNAMELER);
  await seedCollection("raporlar", MOCK_RAPORLAR);
  await seedCollection("tahsilatlar", MOCK_TAHSILATLAR);
  await seedCollection("kdv2", MOCK_KDV2);
  await seedCollection("bildirimler", MOCK_BILDIRIMLER);

  console.log("\n✅ Seed tamamlandı!");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed hatası:", e);
  process.exit(1);
});
