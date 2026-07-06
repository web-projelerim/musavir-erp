import { NextResponse } from "next/server";

/** Hostinger / reverse proxy sağlık kontrolü — 503 teşhisi için */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
}
