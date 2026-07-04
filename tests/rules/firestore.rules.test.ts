/**
 * Firestore güvenlik kuralları testleri.
 *
 * ÇALIŞTIRMA (Firebase Emulator gerekir):
 *   1. npm i -g firebase-tools   (bir kez)
 *   2. firebase emulators:start --only firestore --project demo-musavir
 *   3. Ayrı terminalde: npm run test:rules
 *
 * Emülatör çalışmıyorsa testler otomatik atlanır.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

async function emulatorUp(): Promise<boolean> {
  try {
    const res = await fetch(`http://${EMULATOR_HOST}/`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

let env: RulesTestEnvironment | undefined;

describe("firestore.rules — rol yükseltme ve tenant izolasyonu", () => {
  beforeAll(async () => {
    if (!(await emulatorUp())) {
      console.warn(`[rules-test] Firestore emülatörü ${EMULATOR_HOST} adresinde bulunamadı — testler atlandı.`);
      return;
    }
    env = await initializeTestEnvironment({
      projectId: "demo-musavir",
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
        host: EMULATOR_HOST.split(":")[0],
        port: Number(EMULATOR_HOST.split(":")[1]),
      },
    });

    // Fixture: mevcut bir ofis (kurban) ve o ofiste bir musavir
    await env!.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc("ofisler/kurban-ofis").set({ id: "kurban-ofis", unvan: "Kurban Ofis" });
      await db.doc("kullanicilar/kurban-musavir").set({
        id: "kurban-musavir", rol: "musavir", ofisId: "kurban-ofis",
        email: "kurban@ofis.com", aktif: true,
      });
      await db.doc("musteriler/musteri-1").set({
        id: "musteri-1", ofisId: "kurban-ofis", unvan: "Gizli Müşteri AŞ",
      });
      await db.doc("davetler/davet-1").set({
        id: "davet-1", ofisId: "kurban-ofis", rol: "personel",
        email: "davetli@mail.com", durum: "bekliyor",
      });
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  it.skipIf(() => !env)("SALDIRI: kullanıcı kendini başka ofise musavir olarak kaydedemez", async () => {
    const attacker = env!.authenticatedContext("saldirgan-uid", { email: "s@x.com" }).firestore();
    await assertFails(
      attacker.doc("kullanicilar/saldirgan-uid").set({
        id: "saldirgan-uid", rol: "musavir", ofisId: "kurban-ofis",
        email: "s@x.com", aktif: true,
      })
    );
  });

  it.skipIf(() => !env)("MEŞRU: yeni musavir kendi uid'iyle kendi ofisini kurabilir", async () => {
    const yeni = env!.authenticatedContext("yeni-uid", { email: "yeni@x.com" }).firestore();
    await assertSucceeds(
      yeni.doc("kullanicilar/yeni-uid").set({
        id: "yeni-uid", rol: "musavir", ofisId: "yeni-uid",
        email: "yeni@x.com", aktif: true,
      })
    );
  });

  it.skipIf(() => !env)("SALDIRI: davetli, davetteki rolden farklı bir rolle kayıt olamaz", async () => {
    const davetli = env!.authenticatedContext("davetli-uid", { email: "davetli@mail.com" }).firestore();
    await assertFails(
      davetli.doc("kullanicilar/davetli-uid").set({
        id: "davetli-uid", rol: "musavir", ofisId: "kurban-ofis",
        email: "davetli@mail.com", aktif: true, davetId: "davet-1",
      })
    );
  });

  it.skipIf(() => !env)("MEŞRU: davetli, davetle birebir eşleşen alanlarla kayıt olabilir", async () => {
    const davetli = env!.authenticatedContext("davetli-uid2", { email: "davetli@mail.com" }).firestore();
    await assertSucceeds(
      davetli.doc("kullanicilar/davetli-uid2").set({
        id: "davetli-uid2", rol: "personel", ofisId: "kurban-ofis",
        email: "davetli@mail.com", aktif: true, davetId: "davet-1",
      })
    );
  });

  it.skipIf(() => !env)("SALDIRI: kullanıcı kendi rolünü güncelleyemez", async () => {
    await env!.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("kullanicilar/normal-personel").set({
        id: "normal-personel", rol: "personel", ofisId: "kurban-ofis",
        email: "p@ofis.com", aktif: true,
      });
    });
    const personel = env!.authenticatedContext("normal-personel", { email: "p@ofis.com" }).firestore();
    await assertFails(
      personel.doc("kullanicilar/normal-personel").update({ rol: "musavir" })
    );
  });

  it.skipIf(() => !env)("SALDIRI: başka ofisin musaviri kurban ofisin müşterisini okuyamaz", async () => {
    await env!.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("kullanicilar/rakip-musavir").set({
        id: "rakip-musavir", rol: "musavir", ofisId: "rakip-ofis",
        email: "rakip@ofis.com", aktif: true,
      });
    });
    const rakip = env!.authenticatedContext("rakip-musavir", { email: "rakip@ofis.com" }).firestore();
    await assertFails(rakip.doc("musteriler/musteri-1").get());
  });

  it.skipIf(() => !env)("MEŞRU: kendi ofisinin musaviri müşteriyi okuyabilir", async () => {
    const sahip = env!.authenticatedContext("kurban-musavir", { email: "kurban@ofis.com" }).firestore();
    await assertSucceeds(sahip.doc("musteriler/musteri-1").get());
  });

  it.skipIf(() => !env)("SALDIRI: davetli davetin rol/ofis alanlarını değiştiremez", async () => {
    const davetli = env!.authenticatedContext("davetli-uid3", { email: "davetli@mail.com" }).firestore();
    await assertFails(
      davetli.doc("davetler/davet-1").update({ rol: "musavir", durum: "kullanildi" })
    );
  });

  // ─── B1: Custom claim hızlı yolu ───────────────────────────────────────────

  it.skipIf(() => !env)("CLAIM: rol claim'i taşıyan kullanıcı Firestore dokümanı OLMADAN müşteri okuyabilir", async () => {
    // Bu kullanıcının kullanicilar/{uid} dokümanı YOK — yalnızca claim var.
    const claimUser = env!.authenticatedContext("claim-only-uid", {
      email: "claim@ofis.com",
      rol: "musavir",
      ofisId: "kurban-ofis",
    }).firestore();
    await assertSucceeds(claimUser.doc("musteriler/musteri-1").get());
  });

  it.skipIf(() => !env)("CLAIM: yanlış ofis claim'i taşıyan kullanıcı erişemez", async () => {
    const wrongOffice = env!.authenticatedContext("claim-wrong-uid", {
      email: "wrong@ofis.com",
      rol: "musavir",
      ofisId: "baska-ofis",
    }).firestore();
    await assertFails(wrongOffice.doc("musteriler/musteri-1").get());
  });

  it.skipIf(() => !env)("CLAIM: mukellef claim'i doğru musteriId ile kendi belgesine erişir", async () => {
    const mukellef = env!.authenticatedContext("claim-mukellef-uid", {
      email: "mukellef@mail.com",
      rol: "mukellef",
      ofisId: "kurban-ofis",
      musteriId: "musteri-1",
    }).firestore();
    await assertSucceeds(mukellef.doc("musteriler/musteri-1").get());
  });
});
