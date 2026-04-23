import { readFileSync } from "node:fs";
import {
  DEFAULT_OFIS_ID,
  MOCK_AUDIT_LOGS,
  MOCK_BANKA_EKSTRELERI,
  MOCK_BEYANNAMELER,
  MOCK_BELGELER,
  MOCK_BILDIRIMLER,
  MOCK_DAVETLER,
  MOCK_GIB_SYNC_LOGS,
  MOCK_GONDERIMLER,
  MOCK_GOREVLER,
  MOCK_KDV2,
  MOCK_MUSTERILER,
  MOCK_ODEMELER,
  MOCK_OFISLER,
  MOCK_RAPORLAR,
  MOCK_RESMI_GAZETE_OZETLERI,
  MOCK_TAHAKKUKLAR,
  MOCK_TAHSILATLAR,
  MOCK_TEBLIGATLAR,
} from "../lib/data/mock.ts";

type Primitive = string | number | boolean | null | undefined;

function loadEnv() {
  const content = readFileSync(".env.local", "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

function encodeValue(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeValue(item)) } };
  }
  if (typeof value === "object") {
    const fields = Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, fieldValue]) => fieldValue !== undefined)
        .map(([key, fieldValue]) => [key, encodeValue(fieldValue)])
    );
    return { mapValue: { fields } };
  }
  return { stringValue: String(value as Primitive) };
}

function encodeDocument(data: Record<string, unknown>) {
  return {
    fields: Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, encodeValue(value)])
    ),
  };
}

async function signIn(email: string, password: string, apiKey: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(`Auth failed: ${JSON.stringify(payload)}`);
  return payload as { idToken: string; localId: string };
}

async function upsertDoc(projectId: string, idToken: string, collection: string, id: string, data: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${id}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(encodeDocument(data)),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${collection}/${id} failed: ${text}`);
  }
}

async function seedCollection(projectId: string, idToken: string, collection: string, records: Array<Record<string, unknown>>) {
  for (const record of records) {
    await upsertDoc(projectId, idToken, collection, String(record.id), record);
  }
  console.log(`OK ${collection} ${records.length}`);
}

function withOfficeId(records: Array<Record<string, unknown>>) {
  return records.map((record) => ({
    ofisId: DEFAULT_OFIS_ID,
    ...record,
  }));
}

async function main() {
  loadEnv();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new Error("Firebase env not configured");
  }

  const auth = await signIn("ali@musavir.com", "sifre123", apiKey);

  await upsertDoc(projectId, auth.idToken, "kullanicilar", auth.localId, {
    id: auth.localId,
    ofisId: DEFAULT_OFIS_ID,
    ad: "Ali",
    soyad: "Musavir",
    email: "ali@musavir.com",
    rol: "musavir",
    aktif: true,
    createdAt: new Date().toISOString(),
  });
  console.log("OK kullanicilar/current");

  const collections: Array<[string, Array<Record<string, unknown>>]> = [
    ["ofisler", MOCK_OFISLER as Array<Record<string, unknown>>],
    ["musteriler", withOfficeId(MOCK_MUSTERILER as Array<Record<string, unknown>>)],
    ["gorevler", withOfficeId(MOCK_GOREVLER as Array<Record<string, unknown>>)],
    ["tebligatlar", withOfficeId(MOCK_TEBLIGATLAR as Array<Record<string, unknown>>)],
    ["beyannameler", withOfficeId(MOCK_BEYANNAMELER as Array<Record<string, unknown>>)],
    ["raporlar", withOfficeId(MOCK_RAPORLAR as Array<Record<string, unknown>>)],
    ["bildirimler", withOfficeId(MOCK_BILDIRIMLER as Array<Record<string, unknown>>)],
    ["tahsilatlar", withOfficeId(MOCK_TAHSILATLAR as Array<Record<string, unknown>>)],
    ["tahakkuklar", withOfficeId(MOCK_TAHAKKUKLAR as Array<Record<string, unknown>>)],
    ["odemeler", withOfficeId(MOCK_ODEMELER as Array<Record<string, unknown>>)],
    ["davetler", withOfficeId(MOCK_DAVETLER as Array<Record<string, unknown>>)],
    ["bankaEkstreleri", withOfficeId(MOCK_BANKA_EKSTRELERI as Array<Record<string, unknown>>)],
    ["resmiGazeteOzetleri", withOfficeId(MOCK_RESMI_GAZETE_OZETLERI as Array<Record<string, unknown>>)],
    ["gibSyncLogs", withOfficeId(MOCK_GIB_SYNC_LOGS as Array<Record<string, unknown>>)],
    ["kdv2", withOfficeId(MOCK_KDV2 as Array<Record<string, unknown>>)],
    ["gonderimler", withOfficeId(MOCK_GONDERIMLER as Array<Record<string, unknown>>)],
    ["belgeler", withOfficeId(MOCK_BELGELER as Array<Record<string, unknown>>)],
    ["auditLogs", withOfficeId(MOCK_AUDIT_LOGS as Array<Record<string, unknown>>)],
  ];

  for (const [collection, records] of collections) {
    await seedCollection(projectId, auth.idToken, collection, records);
  }

  console.log("SEED_DONE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
