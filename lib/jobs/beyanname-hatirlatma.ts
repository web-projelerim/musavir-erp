import "server-only";

/**
 * Beyanname hatırlatma iş mantığı — SADECE MÜŞAVİRE gider (müvekkile değil).
 * /api/cron/beyanname-hatirlatma tarafından çağrılır.
 *
 * Son tarihi yaklaşan (varsayılan 3 gün) ve henüz verilmemiş beyannameler için
 * müşaviri üç kanaldan uyarır:
 *   1) Uygulama içi bildirim (bildirimler koleksiyonu → zil)
 *   2) Müşavirin WhatsApp'ı (Ofis.telefon) — ofis başına günlük özet
 *   3) Dashboard (zaten "Yaklaşan Beyanname" olarak gösteriyor — ek iş yok)
 *
 * Gerekli env: FIREBASE_SERVICE_ACCOUNT_KEY
 * Opsiyonel: WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID, BEYANNAME_HATIRLATMA_GUN (vars. 3)
 */

import { getAdminDb, adminUpsert } from "@/lib/firebase/admin";
import { whatsappGonder } from "@/lib/integrations/whatsapp/server";
import type { Beyanname, Ofis } from "@/lib/types";

export interface BeyannameHatirlatmaSonuc {
  ok: boolean;
  incelenenBeyanname: number;
  yaklasanBeyanname: number;
  olusturulanBildirim: number;
  musavireWhatsapp: number;
  mesaj?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function formatTarih(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("tr-TR");
}

export async function runBeyannameHatirlatma(): Promise<BeyannameHatirlatmaSonuc> {
  const bos: BeyannameHatirlatmaSonuc = {
    ok: true,
    incelenenBeyanname: 0,
    yaklasanBeyanname: 0,
    olusturulanBildirim: 0,
    musavireWhatsapp: 0,
  };

  const db = getAdminDb();
  if (!db) {
    return { ...bos, ok: false, mesaj: "FIREBASE_SERVICE_ACCOUNT_KEY eksik — Firebase Admin başlatılamadı" };
  }

  const gun = Number(process.env.BEYANNAME_HATIRLATMA_GUN ?? "3");
  const esik = new Date();
  esik.setDate(esik.getDate() + (Number.isFinite(gun) ? gun : 3));
  esik.setHours(23, 59, 59, 999);
  const esikIso = esik.toISOString();
  const bugunYmd = new Date().toISOString().slice(0, 10);

  // Henüz verilmemiş beyannameler; sonTarih bellekte filtrelenir
  const snap = await db.collection("beyannameler").where("durum", "==", "bekliyor").get();
  const tumu = snap.docs.map((d) => d.data() as Beyanname);
  const yaklasanlar = tumu.filter((b) => b.sonTarih && b.sonTarih <= esikIso);

  const sonuc: BeyannameHatirlatmaSonuc = {
    ...bos,
    incelenenBeyanname: tumu.length,
    yaklasanBeyanname: yaklasanlar.length,
  };

  // Ofis bazında grupla
  const ofisMap = new Map<string, Beyanname[]>();
  for (const b of yaklasanlar) {
    if (!b.ofisId) continue;
    const list = ofisMap.get(b.ofisId) ?? [];
    list.push(b);
    ofisMap.set(b.ofisId, list);
  }

  for (const [ofisId, beyanlar] of Array.from(ofisMap.entries())) {
    // 1) Her beyanname için uygulama-içi bildirim (günde bir kez, idempotent)
    for (const b of beyanlar) {
      const bildirimId = `beyan-hatirlatma-${b.id}-${bugunYmd}`;
      const mevcut = await db.collection("bildirimler").doc(bildirimId).get();
      if (mevcut.exists) continue;
      await adminUpsert("bildirimler", bildirimId, {
        id: bildirimId,
        ofisId,
        musteriId: b.musteriId,
        tip: "beyanname",
        baslik: "📅 Beyanname son tarihi yaklaşıyor",
        mesaj: `${b.musteriAdi} — ${b.tur} ${b.donem}: son tarih ${formatTarih(b.sonTarih)}`,
        durum: "okunmamis",
        tarih: nowIso(),
        link: "/beyannameler",
        onemDerecesi: "yuksek",
        beyannameId: b.id,
      });
      sonuc.olusturulanBildirim += 1;
    }

    // 2) Müşavire özet WhatsApp — ofis başına günde bir (idempotent)
    const waLogId = `beyan-musavir-wa-${ofisId}-${bugunYmd}`;
    const waLog = await db.collection("cronHatirlatmaLog").doc(waLogId).get();
    if (waLog.exists) continue;

    const ofisDoc = await db.collection("ofisler").doc(ofisId).get();
    const ofis = ofisDoc.exists ? (ofisDoc.data() as Ofis) : undefined;
    const telefon = ofis?.telefon;
    if (!telefon) continue;

    const enYakin = beyanlar
      .map((b) => b.sonTarih)
      .sort()[0];
    const mesaj =
      `MusavirERP hatırlatma: ${beyanlar.length} beyannamenin son tarihi yaklaşıyor ` +
      `(en yakını ${formatTarih(enYakin)}). Detaylar için panele göz atın.`;

    const gonderim = await whatsappGonder({ phone: telefon, body: mesaj });
    // Sonuç ne olursa olsun günlük tekrarı engelle
    await adminUpsert("cronHatirlatmaLog", waLogId, {
      id: waLogId,
      ofisId,
      tip: "beyanname_musavir_wa",
      beyannameSayisi: beyanlar.length,
      gonderildi: gonderim.ok,
      simulated: gonderim.simulated ?? false,
      hataMesaji: gonderim.ok ? undefined : gonderim.hataMesaji,
      tarih: nowIso(),
    });
    if (gonderim.ok) sonuc.musavireWhatsapp += 1;
  }

  return sonuc;
}
