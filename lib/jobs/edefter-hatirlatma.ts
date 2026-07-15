import "server-only";

/**
 * E-Defter hatırlatma iş mantığı — SADECE MÜŞAVİRE gider (§2.3).
 * /api/cron/edefter-hatirlatma tarafından çağrılır (vars. her ayın 26'sı 08:00).
 *
 * E-Defter yükümlüsü (eDefter: "yuklu_aylik" | "yuklu_3aylik" | "yuklu") aktif
 * mükellefleri sayar ve müşaviri iki kanaldan uyarır:
 *   1) Uygulama içi bildirim (bildirimler koleksiyonu → zil)
 *   2) Müşavirin WhatsApp'ı (Ofis.telefon) — ofis başına aylık özet
 *
 * Hangi dönemin beratının ne zaman dolduğu lib/domain/edefterPlan.ts'ten gelir
 * (kaynak: vergiTakvimi.ts). 3 aylık yükümlüler yalnızca berat aylarında
 * (Oca/Nis/Tem/Eki) sayıya katılır — çeyreğin kapandığı ayda değil.
 *
 * Gerekli env: FIREBASE_SERVICE_ACCOUNT_KEY
 * Opsiyonel: WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID
 */

import { getAdminDb, adminUpsert } from "@/lib/firebase/admin";
import { whatsappGonder } from "@/lib/integrations/whatsapp/server";
import { edefterBeratPlani, tarihTR } from "@/lib/domain/edefterPlan";
import type { Musteri, Ofis } from "@/lib/types";

export interface EDefterHatirlatmaSonuc {
  ok: boolean;
  incelenenMukellef: number;
  aylikYukumlu: number;
  ucAylikYukumlu: number;
  olusturulanBildirim: number;
  musavireWhatsapp: number;
  mesaj?: string;
}

function nowIso() {
  return new Date().toISOString();
}

export async function runEDefterHatirlatma(): Promise<EDefterHatirlatmaSonuc> {
  const bos: EDefterHatirlatmaSonuc = {
    ok: true,
    incelenenMukellef: 0,
    aylikYukumlu: 0,
    ucAylikYukumlu: 0,
    olusturulanBildirim: 0,
    musavireWhatsapp: 0,
  };

  const db = getAdminDb();
  if (!db) {
    return { ...bos, ok: false, mesaj: "FIREBASE_SERVICE_ACCOUNT_KEY eksik — Firebase Admin başlatılamadı" };
  }

  const bugun = new Date();
  const plan = edefterBeratPlani(bugun);
  const donemYmd = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}`;

  const snap = await db.collection("musteriler").where("durum", "==", "aktif").get();
  const tumu = snap.docs.map((d) => d.data() as Musteri);

  const aylik = tumu.filter((m) => m.eDefter === "yuklu_aylik" || m.eDefter === "yuklu");
  const ucAylik = tumu.filter((m) => m.eDefter === "yuklu_3aylik");

  const sonuc: EDefterHatirlatmaSonuc = {
    ...bos,
    incelenenMukellef: tumu.length,
    aylikYukumlu: aylik.length,
    ucAylikYukumlu: ucAylik.length,
  };

  // Ofis bazında yükümlü say (3 aylık sadece berat ayında — Oca/Nis/Tem/Eki — sayılır)
  const ofisMap = new Map<string, { aylik: number; ucAylik: number }>();
  const ekle = (ofisId: string | undefined, alan: "aylik" | "ucAylik") => {
    if (!ofisId) return;
    const kayit = ofisMap.get(ofisId) ?? { aylik: 0, ucAylik: 0 };
    kayit[alan] += 1;
    ofisMap.set(ofisId, kayit);
  };
  aylik.forEach((m) => ekle(m.ofisId, "aylik"));
  if (plan.ucAylik) ucAylik.forEach((m) => ekle(m.ofisId, "ucAylik"));

  for (const [ofisId, sayi] of Array.from(ofisMap.entries())) {
    const toplam = sayi.aylik + sayi.ucAylik;
    if (toplam === 0) continue;

    // "Nisan 2026 dönemi: 5 mükellef (aylık) · 1. Çeyrek (Oca–Mar) 2026: 2 mükellef (3 aylık)"
    const parcalar: string[] = [];
    if (sayi.aylik > 0) {
      parcalar.push(`${plan.aylik.donemAdi} dönemi: ${sayi.aylik} mükellef (aylık)`);
    }
    if (plan.ucAylik && sayi.ucAylik > 0) {
      parcalar.push(`${plan.ucAylik.ceyrekAdi}: ${sayi.ucAylik} mükellef (3 aylık)`);
    }
    const detay = parcalar.join(" · ");
    const sonTarihTR = tarihTR(plan.aylik.sonTarih);

    // 1) Uygulama-içi bildirim (aylık idempotent)
    const bildirimId = `edefter-hatirlatma-${ofisId}-${donemYmd}`;
    const mevcut = await db.collection("bildirimler").doc(bildirimId).get();
    if (!mevcut.exists) {
      await adminUpsert("bildirimler", bildirimId, {
        id: bildirimId,
        ofisId,
        tip: "beyanname",
        baslik: `📗 E-Defter berat son tarihi ${sonTarihTR}`,
        mesaj: `${detay}. Son yükleme tarihi ${sonTarihTR}.`,
        durum: "okunmamis",
        tarih: nowIso(),
        link: "/edefter",
        onemDerecesi: "yuksek",
      });
      sonuc.olusturulanBildirim += 1;
    }

    // 2) Müşavire özet WhatsApp — ofis başına aylık (idempotent)
    const waLogId = `edefter-musavir-wa-${ofisId}-${donemYmd}`;
    const waLog = await db.collection("cronHatirlatmaLog").doc(waLogId).get();
    if (waLog.exists) continue;

    const ofisDoc = await db.collection("ofisler").doc(ofisId).get();
    const ofis = ofisDoc.exists ? (ofisDoc.data() as Ofis) : undefined;
    const telefon = ofis?.telefon;
    if (!telefon) continue;

    const mesaj =
      `MusavirERP hatırlatma — e-Defter berat son tarihi ${sonTarihTR}. ` +
      `${detay}. Detaylar için E-Defter Takip sayfasına göz atın.`;
    const gonderim = await whatsappGonder({ phone: telefon, body: mesaj });
    await adminUpsert("cronHatirlatmaLog", waLogId, {
      id: waLogId,
      ofisId,
      tip: "edefter_musavir_wa",
      mukellefSayisi: toplam,
      gonderildi: gonderim.ok,
      simulated: gonderim.simulated ?? false,
      hataMesaji: gonderim.ok ? undefined : gonderim.hataMesaji,
      tarih: nowIso(),
    });
    if (gonderim.ok) sonuc.musavireWhatsapp += 1;
  }

  return sonuc;
}
