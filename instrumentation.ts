/**
 * Next.js Instrumentation Hook — sunucu başladığında bir kez çalışır.
 * node-cron ile GİB otomatik sync'i saatte bir tetikler.
 *
 * Dokümantasyon: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Sadece Node.js çalışma ortamında çalıştır (Edge runtime'da değil)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    // node-cron v4'te named export kullanılır (default export yok)
    const cronModule = await import("node-cron");
    const cronSchedule = cronModule.schedule ?? (cronModule as unknown as { default: typeof cronModule }).default?.schedule;
    const cronValidate = cronModule.validate ?? (cronModule as unknown as { default: typeof cronModule }).default?.validate;

    if (!cronSchedule || !cronValidate) {
      console.error("[GİB Sync] node-cron modülü yüklenemedi");
      return;
    }

    const { runGibSync } = await import("@/lib/jobs/gib-sync");

    // Her saat başı (dakika 0): "0 * * * *"
    // Test için her dakika: "* * * * *"
    const schedule = process.env.GIB_SYNC_SCHEDULE ?? "0 * * * *";

    if (!cronValidate(schedule)) {
      console.error("[GİB Sync] Geçersiz cron ifadesi:", schedule);
      return;
    }

    cronSchedule(schedule, async () => {
      console.info("[GİB Sync] Otomatik sync başladı", new Date().toISOString());
      try {
        const sonuc = await runGibSync();
        if (sonuc.ok) {
          console.info(
            `[GİB Sync] Tamamlandı — ${sonuc.islenenOfis} ofis, sonuçlar:`,
            sonuc.sonuclar.map((s) => `${s.ofisId}: ${s.tebligatSayisi} tebligat, ${s.beyannameSayisi} beyanname`).join(" | ")
          );
        } else {
          console.warn("[GİB Sync] Tamamlanamadı:", sonuc.mesaj);
        }
      } catch (err) {
        console.error("[GİB Sync] Beklenmedik hata:", err);
      }
    });

    console.info(`[GİB Sync] Cron zamanlandı — schedule: "${schedule}"`);
  } catch (err) {
    // Cron başlatma hatası sunucuyu çökertmemeli — sadece logla
    console.error("[GİB Sync] Cron başlatılamadı (sunucu etkilenmedi):", err);
  }
}
