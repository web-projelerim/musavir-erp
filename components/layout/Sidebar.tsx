"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  Bell,
  AlertTriangle,
  Calculator,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { MOCK_GOREVLER, MOCK_TEBLIGATLAR } from "@/lib/data/mock";

const NAV: {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: "gorevler" | "tebligatlar";
}[] = [
  { label: "Genel Bakış",       href: "/dashboard",   icon: LayoutDashboard },
  { label: "Müşteriler",        href: "/musteriler",  icon: Users },
  { label: "Görevler",          href: "/gorevler",    icon: CheckSquare, badge: "gorevler" },
  { label: "Raporlar",          href: "/raporlar",    icon: FileText },
  { label: "Tebligat & Beyan",  href: "/tebligatlar", icon: Bell,       badge: "tebligatlar" },
  { label: "Risk Merkezi",      href: "/risk",        icon: AlertTriangle },
  { label: "KDV2 Hesaplama",    href: "/kdv2",        icon: Calculator },
];

export function Sidebar() {
  const pathname = usePathname();

  const badgeCount = (key: "gorevler" | "tebligatlar") =>
    key === "gorevler"
      ? MOCK_GOREVLER.filter((g) => g.durum !== "tamamlandi" && g.durum !== "iptal").length
      : MOCK_TEBLIGATLAR.filter((t) => t.durum === "yeni").length;

  return (
    <aside className="fixed top-0 left-0 h-screen flex flex-col z-40"
      style={{ width: "var(--sidebar-w, 220px)", background: "#0f172a", borderRight: "1px solid #1e293b" }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4" style={{ borderBottom: "1px solid #1e293b" }}>
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: "#2563eb" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path fill="#fff" d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold leading-none" style={{ fontSize: 13 }}>MusavirERP</p>
          <p style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Mali Müşavir</p>
        </div>
      </div>

      {/* Firma seçici */}
      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #1e293b" }}>
        <button className="w-full flex items-center justify-between px-2.5 py-2 rounded text-left hover:bg-white/5 transition-colors"
          style={{ border: "1px solid #1e293b" }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-2xs font-bold text-white"
              style={{ background: "#7c3aed", fontSize: 9 }}>
              AM
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 500 }}>Ali Müşavir</p>
              <p style={{ fontSize: 10, color: "#475569" }}>Müşavir</p>
            </div>
          </div>
          <ChevronDown style={{ width: 12, height: 12, color: "#475569" }} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <p style={{ fontSize: 10, color: "#334155", fontWeight: 500, letterSpacing: "0.06em",
          textTransform: "uppercase", padding: "6px 8px 4px" }}>
          Ana Menü
        </p>
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const count = item.badge ? badgeCount(item.badge) : 0;

            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "relative flex items-center justify-between px-2.5 py-2 rounded group transition-colors",
                  active ? "nav-item-active" : ""
                )}
                style={{
                  background: active ? "#1e293b" : "transparent",
                  color: active ? "#f1f5f9" : "#94a3b8",
                }}>
                <span className="flex items-center gap-2.5">
                  <item.icon style={{ width: 14, height: 14, flexShrink: 0,
                    color: active ? "#60a5fa" : "#475569" }} />
                  <span style={{ fontSize: 12, fontWeight: active ? 500 : 400 }}>{item.label}</span>
                </span>
                {count > 0 && (
                  <span className="text-white rounded-full text-center"
                    style={{ fontSize: 10, fontWeight: 600, minWidth: 18, height: 18,
                      lineHeight: "18px", padding: "0 5px",
                      background: active ? "#3b82f6" : "#ef4444" }}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 py-2" style={{ borderTop: "1px solid #1e293b" }}>
        <Link href="/ayarlar"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors hover:bg-white/5"
          style={{ color: pathname === "/ayarlar" ? "#f1f5f9" : "#94a3b8" }}>
          <Settings style={{ width: 14, height: 14, color: "#475569" }} />
          <span style={{ fontSize: 12 }}>Ayarlar</span>
        </Link>
        <Link href="/giris"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors hover:bg-red-500/10"
          style={{ color: "#64748b" }}>
          <LogOut style={{ width: 14, height: 14 }} />
          <span style={{ fontSize: 12 }}>Çıkış Yap</span>
        </Link>
      </div>
    </aside>
  );
}
