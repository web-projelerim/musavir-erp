/**
 * POST /api/email/send
 *
 * SMTP üzerinden e-posta gönderir.
 * Davet linkleri ve rapor bildirimleri için kullanılır.
 *
 * Gerekli env değişkenleri:
 *   SMTP_HOST  — SMTP sunucu adresi (ör. smtp.gmail.com)
 *   SMTP_PORT  — SMTP portu (varsayılan: 587)
 *   SMTP_USER  — SMTP kullanıcı adı / e-posta
 *   SMTP_PASS  — SMTP şifresi / app password
 *
 * Env yoksa 501 döner (simülasyon modu).
 *
 * UYARI: Bu route "nodemailer" paketini kullanır.
 * `npm install nodemailer @types/nodemailer` gerektirir.
 *
 * Body:
 *   {
 *     to: string;          ← alıcı e-posta
 *     subject: string;     ← konu
 *     html: string;        ← HTML içerik
 *     text?: string;       ← düz metin alternatifi
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/verifyToken";

interface EmailBody {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function POST(req: NextRequest) {
  if (!await requireAuth(req)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    // STUB — MVP dışı: SMTP env yoksa simülasyon modu
    return NextResponse.json(
      {
        ok: false,
        stub: true,
        mesaj: "SMTP_HOST / SMTP_USER / SMTP_PASS env değişkenleri tanımlanmamış. E-posta gönderimi pasif.",
      },
      { status: 501 }
    );
  }

  try {
    const body: EmailBody = await req.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "to, subject ve html alanları zorunludur" },
        { status: 400 }
      );
    }

    // nodemailer ile gönderim
    // TODO(faz-2): `npm install nodemailer @types/nodemailer` ile aktifleştirin.
    // Şu an SMTP env'leri tanımlı fakat nodemailer kurulu olmayabilir.
    // Runtime'da paket yoksa açıklayıcı hata döner.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodemailer = await (
      // Webpack/TypeScript tarafından statik analiz edilmemesi için eval kullanılır
      // Bu sadece server-side route'ta çalışır (Node.js ortamı)
      eval('import("nodemailer")') as Promise<Record<string, unknown>>
    ).catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>;

    if (typeof nodemailer.createTransport !== "function") {
      return NextResponse.json(
        { error: "nodemailer paketi yüklü değil. Terminalde: npm install nodemailer @types/nodemailer" },
        { status: 500 }
      );
    }

    const createTransport = nodemailer.createTransport as (...args: unknown[]) => { sendMail: (opts: unknown) => Promise<unknown> };
    const transporter = createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"MusavirERP" <${smtpUser}>`,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ""),
    });

    return NextResponse.json({ ok: true, to, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[Email Send]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
