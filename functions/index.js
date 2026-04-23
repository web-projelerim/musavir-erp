"use strict";

const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const DEFAULT_OFFICE_ID = "ofis-default";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildTahakkukMessage(tahakkuk) {
  return `Panel uzerinden guncel tahakkukunuz tanimlanmistir, lutfen kontrol ediniz: ${tahakkuk.panelLinki || "/panel"}`;
}

async function sendWhatsAppCloudMessage({ to, body }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    logger.info("WhatsApp credentials missing, simulated send");
    return { ok: true, provider: "simulated" };
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${errorText}`);
  }

  return { ok: true, provider: "meta-cloud" };
}

async function processTahakkukNotificationsJob() {
  const today = todayIso();
  const snapshot = await db
    .collection("tahakkuklar")
    .where("bildirimDurumu", "in", ["planlandi", "beklemede"])
    .get();

  const officeCache = new Map();

  for (const doc of snapshot.docs) {
    const tahakkuk = { id: doc.id, ...doc.data() };
    if (tahakkuk.vadeTarihi > today && tahakkuk.bildirimDurumu !== "planlandi") continue;

    let musteriDoc = await db.collection("musteriler").doc(tahakkuk.musteriId).get();
    if (!musteriDoc.exists) {
      await doc.ref.update({ bildirimDurumu: "basarisiz", updatedAt: new Date().toISOString() });
      continue;
    }

    const musteri = musteriDoc.data();
    const phone = String(musteri.telefon || "").replace(/\D/g, "");
    const payload = {
      to: phone,
      body: buildTahakkukMessage(tahakkuk),
    };

    const gonderimRef = db.collection("gonderimler").doc();
    try {
      await sendWhatsAppCloudMessage(payload);
      await gonderimRef.set({
        id: gonderimRef.id,
        ofisId: tahakkuk.ofisId || DEFAULT_OFFICE_ID,
        kanal: "whatsapp",
        musteriId: tahakkuk.musteriId,
        musteriAdi: tahakkuk.musteriAdi,
        sablonId: "tahakkuk",
        icerikRef: tahakkuk.id,
        mesaj: payload.body,
        durum: "gonderildi",
        denemeSayisi: 1,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      });
      await doc.ref.update({
        bildirimDurumu: "gonderildi",
        updatedAt: new Date().toISOString(),
      });
      const officeId = tahakkuk.ofisId || DEFAULT_OFFICE_ID;
      officeCache.set(officeId, true);
    } catch (error) {
      logger.error("Tahakkuk bildirimi gonderilemedi", error);
      await gonderimRef.set({
        id: gonderimRef.id,
        ofisId: tahakkuk.ofisId || DEFAULT_OFFICE_ID,
        kanal: "whatsapp",
        musteriId: tahakkuk.musteriId,
        musteriAdi: tahakkuk.musteriAdi,
        sablonId: "tahakkuk",
        icerikRef: tahakkuk.id,
        mesaj: payload.body,
        durum: "basarisiz",
        hataMesaji: error instanceof Error ? error.message : String(error),
        denemeSayisi: 1,
        createdAt: new Date().toISOString(),
      });
      await doc.ref.update({
        bildirimDurumu: "basarisiz",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return { officesTouched: officeCache.size };
}

async function fetchResmiGazeteItems() {
  const response = await fetch("https://www.resmigazete.gov.tr/");
  const html = await response.text();
  const lines = html
    .split("\n")
    .map((line) => line.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const relevant = lines.filter((line) =>
    /(vergi|beyanname|sgk|kdv|kurumlar|mukellef|muhasebe|ceza|yapilandirma)/i.test(line)
  );

  return relevant.slice(0, 5).map((title, index) => ({
    id: `rg-auto-${todayIso()}-${index + 1}`,
    title,
    sourceUrl: "https://www.resmigazete.gov.tr/",
  }));
}

function summarizeResmiGazete(title) {
  return {
    kategori: "vergi",
    aiOzet: `Bu baslik mali musavirlik surecini etkileyebilir: ${title}`,
    maliMusavirEtkisi: "Beyan, sure, belge veya odeme takibi icin portfoy kontrolu onerilir.",
    aksiyonGerekiyor: true,
    maliMusavirEtkiPuani: 75,
  };
}

async function refreshResmiGazeteSummariesJob() {
  const items = await fetchResmiGazeteItems();
  for (const item of items) {
    const summary = summarizeResmiGazete(item.title);
    await db.collection("resmiGazeteOzetleri").doc(item.id).set({
      id: item.id,
      ofisId: DEFAULT_OFFICE_ID,
      yayinTarihi: todayIso(),
      baslik: item.title,
      kaynakLink: item.sourceUrl,
      ...summary,
      durum: "yeni",
      createdAt: new Date().toISOString(),
    }, { merge: true });
  }
  return { count: items.length };
}

async function syncGibDataJob() {
  const ref = db.collection("gibSyncLogs").doc();
  const startedAt = new Date().toISOString();
  await ref.set({
    id: ref.id,
    ofisId: DEFAULT_OFFICE_ID,
    syncTipi: "tebligat",
    durum: "bekliyor",
    baslamaTarihi: startedAt,
    islenenKayitSayisi: 0,
    createdBy: "system",
  });

  await ref.set({
    durum: "basarisiz",
    bitisTarihi: new Date().toISOString(),
    islenenKayitSayisi: 0,
    hataMesaji: "GIB resmi erisim bilgileri tanimlanmadigi icin manual/mock mod aktif.",
  }, { merge: true });

  return { id: ref.id };
}

exports.processTahakkukNotifications = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Europe/Istanbul", region: "europe-west1" },
  async () => {
    const result = await processTahakkukNotificationsJob();
    logger.info("Tahakkuk notifications processed", result);
  }
);

exports.refreshResmiGazeteSummaries = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/Istanbul", region: "europe-west1" },
  async () => {
    const result = await refreshResmiGazeteSummariesJob();
    logger.info("Resmi Gazete summaries refreshed", result);
  }
);

exports.syncGibData = onSchedule(
  { schedule: "30 7 * * *", timeZone: "Europe/Istanbul", region: "europe-west1" },
  async () => {
    const result = await syncGibDataJob();
    logger.info("GIB sync placeholder executed", result);
  }
);

exports.runTahakkukNotificationsNow = onRequest({ region: "europe-west1" }, async (_req, res) => {
  try {
    const result = await processTahakkukNotificationsJob();
    res.json({ ok: true, ...result });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

exports.runResmiGazeteNow = onRequest({ region: "europe-west1" }, async (_req, res) => {
  try {
    const result = await refreshResmiGazeteSummariesJob();
    res.json({ ok: true, ...result });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

exports.runGibSyncNow = onRequest({ region: "europe-west1" }, async (_req, res) => {
  try {
    const result = await syncGibDataJob();
    res.json({ ok: true, ...result });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
