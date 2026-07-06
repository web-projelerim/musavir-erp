/**
 * Next.js Instrumentation Hook — sunucu başladığında bir kez çalışır.
 * node-cron ile zamanlanmış işleri tetikler.
 *
 * Deploy hedefi Hostinger (kalıcı Node.js process) — Vercel Cron KULLANILMIYOR.
 * Eskiden vercel.json'da tanımlı 3 cron burada node-cron ile çalışır:
 *   - GİB sync            → "0 * * * *" (saatlik)   — runGibSync() doğrudan
 *   - Vade hatırlatma     → "0 9 * * *" (09:00)     — /api/cron/vade-hatirlatma
 *   - Vergi takvimi sync  → "0 6 * * *" (06:00)     — /api/cron/vergi-takvimi-sync
 *
 * HTTP tabanlı iki cron, loopback üzerinden CRON_SECRET ile tetiklenir
 * (route mantığı tek kaynak olarak korunur; kod tekrarı olmaz).
 *
 * Dokümantasyon: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

type CronSchedule = (expr: string, cb: () => void | Promise<void>) => unknown;
type CronValidate = (expr: string) => boolean;

async function cronZamanlayiciyiBaslat() {
  try {
    const cronModule = await import("node-cron");
    const cronSchedule = (cronModule.schedule ??
      (cronModule as unknown as { default: typeof cronModule }).default?.schedule) as CronSchedule | undefined;
    const cronValidate = (cronModule.validate ??
      (cronModule as unknown as { default: typeof cronModule }).default?.validate) as CronValidate | undefined;

    if (!cronSchedule || !cronValidate) {
      console.error("[Cron] node-cron modülü yüklenemedi");
      return;
    }

    // Verilen ifadeyi doğrular, geçerliyse zamanlar. Hata izole edilir.
    const zamanla = (isim: string, expr: string, gorev: () => Promise<void>) => {
      if (!cronValidate(expr)) {
        console.error(`[${isim}] Geçersiz cron ifadesi:`, expr);
        return;
      }
      cronSchedule(expr, async () => {
        console.info(`[${isim}] Başladı`, new Date().toISOString());
        try {
          await gorev();
        } catch (err) {
          console.error(`[${isim}] Beklenmedik hata:`, err);
        }
      });
      console.info(`[${isim}] Cron zamanlandı — schedule: "${expr}"`);
    };

    // ── 1) GİB sync — job fonksiyonu doğrudan çağrılır (HTTP'siz) ──
    const { runGibSync } = await import("@/lib/jobs/gib-sync");
    zamanla("GİB Sync", process.env.GIB_SYNC_SCHEDULE ?? "0 * * * *", async () => {
      const sonuc = await runGibSync();
      if (sonuc.ok) {
        console.info(
          `[GİB Sync] Tamamlandı — ${sonuc.islenenOfis} ofis, sonuçlar:`,
          sonuc.sonuclar
            .map((s) => `${s.ofisId}: ${s.tebligatSayisi} tebligat, ${s.beyannameSayisi} beyanname`)
            .join(" | ")
        );
      } else {
        console.warn("[GİB Sync] Tamamlanamadı:", sonuc.mesaj);
      }
    });

    // ── 2 & 3) HTTP tabanlı cron route'ları — loopback + CRON_SECRET ──
    // Vercel Cron'un yaptığı gibi endpoint'leri çağırır; route mantığı korunur.
    const cronSecret = process.env.CRON_SECRET;
    const internalBase =
      process.env.CRON_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

    const httpCronTetikle = async (isim: string, path: string) => {
      if (!cronSecret) {
        console.warn(`[${isim}] CRON_SECRET tanımlı değil — atlandı (endpoint fail-closed).`);
        return;
      }
      const res = await fetch(`${internalBase}${path}`, {
        method: "GET",
        headers: { authorization: `Bearer ${cronSecret}` },
        signal: AbortSignal.timeout(290_000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        console.info(`[${isim}] Tamamlandı`, data);
      } else {
        console.warn(`[${isim}] Başarısız — HTTP ${res.status}`, data);
      }
    };

    zamanla("Vergi Takvimi Sync", process.env.VERGI_TAKVIMI_SCHEDULE ?? "0 6 * * *", () =>
      httpCronTetikle("Vergi Takvimi Sync", "/api/cron/vergi-takvimi-sync")
    );

    zamanla("Vade Hatırlatma", process.env.VADE_HATIRLATMA_SCHEDULE ?? "0 9 * * *", () =>
      httpCronTetikle("Vade Hatırlatma", "/api/cron/vade-hatirlatma")
    );

    zamanla("Beyanname Hatırlatma", process.env.BEYANNAME_HATIRLATMA_SCHEDULE ?? "0 8 * * *", () =>
      httpCronTetikle("Beyanname Hatırlatma", "/api/cron/beyanname-hatirlatma")
    );
  } catch (err) {
    // Cron başlatma hatası sunucuyu çökertmemeli — sadece logla
    console.error("[Cron] Zamanlayıcı başlatılamadı (sunucu etkilenmedi):", err);
  }
}

export async function register() {
  // Sadece Node.js çalışma ortamında çalıştır (Edge runtime'da değil)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.ENABLE_CRON === "false") {
    console.info("[Cron] ENABLE_CRON=false — zamanlayıcı devre dışı");
    return;
  }

  // Hostinger: sunucu önce dinlemeye başlasın, ağır modüller sonra yüklensin (503 önleme)
  const gecikmeMs = Number(process.env.CRON_START_DELAY_MS ?? "15000");
  setTimeout(() => {
    void cronZamanlayiciyiBaslat();
  }, gecikmeMs);
  console.info(`[Cron] Zamanlayıcı ${gecikmeMs}ms sonra başlatılacak`);
}
