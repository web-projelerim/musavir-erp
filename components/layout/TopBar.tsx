"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, X, ExternalLink, ChevronDown } from "lucide-react";
import { MOCK_BILDIRIMLER } from "@/lib/data/mock";
import { formatSureGecmis } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

export function TopBar() {
  const [showNotif, setShowNotif] = useState(false);
  const [search, setSearch] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const okunmamis = MOCK_BILDIRIMLER.filter((b) => b.durum === "okunmamis").length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5"
      style={{
        height: "var(--topbar-h, 52px)",
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
      }}>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 rounded"
        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", height: 32, width: 280 }}>
        <Search style={{ width: 13, height: 13, color: "#9ca3af", flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Müşteri, VKN, görev ara..."
          style={{ background: "transparent", border: "none", outline: "none",
            fontSize: 12, color: "#374151", flex: 1 }}
        />
        {search ? (
          <button onClick={() => setSearch("")}>
            <X style={{ width: 12, height: 12, color: "#9ca3af" }} />
          </button>
        ) : (
          <kbd style={{ fontSize: 10, color: "#9ca3af", border: "1px solid #e5e7eb",
            borderRadius: 3, padding: "1px 4px", fontFamily: "monospace" }}>
            ⌘K
          </kbd>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button onClick={() => setShowNotif(!showNotif)}
            className="relative flex items-center justify-center rounded transition-colors hover:bg-gray-100"
            style={{ width: 32, height: 32 }}>
            <Bell style={{ width: 15, height: 15, color: "#6b7280" }} />
            {okunmamis > 0 && (
              <span className="absolute flex items-center justify-center rounded-full bg-red-500 text-white"
                style={{ width: 14, height: 14, fontSize: 8, fontWeight: 700,
                  top: 5, right: 5, border: "1.5px solid white" }}>
                {okunmamis}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-1 animate-fade-up"
              style={{ width: 320, background: "#fff", border: "1px solid #e5e7eb",
                borderRadius: 8, boxShadow: "0 8px 24px -4px rgb(0 0 0 / 0.12)", zIndex: 50 }}>

              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Bildirimler</span>
                <div className="flex items-center gap-2">
                  {okunmamis > 0 && (
                    <span className="text-white rounded-full px-2"
                      style={{ fontSize: 10, background: "#ef4444", padding: "1px 7px" }}>
                      {okunmamis} yeni
                    </span>
                  )}
                  <button onClick={() => setShowNotif(false)}
                    style={{ color: "#9ca3af" }} className="hover:text-gray-600">
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {MOCK_BILDIRIMLER.map((b) => (
                  <div key={b.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    style={{ borderBottom: "1px solid #f9fafb",
                      background: b.durum === "okunmamis" ? "#fefce8" : undefined }}>
                    <div className="flex items-start gap-2.5">
                      {b.durum === "okunmamis" && (
                        <div className="rounded-full flex-shrink-0 mt-1"
                          style={{ width: 6, height: 6, background: "#3b82f6", marginTop: 5 }} />
                      )}
                      <div style={{ marginLeft: b.durum === "okundu" ? 14 : 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{b.baslik}</p>
                        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{b.mesaj}</p>
                        <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>
                          {formatSureGecmis(b.tarih)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: "1px solid #f3f4f6" }}>
                <button style={{ fontSize: 11, color: "#3b82f6", fontWeight: 500 }}>
                  Tümünü okundu işaretle
                </button>
                <Link href="#" style={{ fontSize: 11, color: "#6b7280" }}
                  className="flex items-center gap-1 hover:text-gray-900">
                  Tümünü gör <ExternalLink style={{ width: 10, height: 10 }} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 4px" }} />

        {/* User */}
        <button className="flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors hover:bg-gray-100"
          style={{ height: 32 }}>
          <div className="flex items-center justify-center rounded-full text-white font-semibold"
            style={{ width: 22, height: 22, background: "#7c3aed", fontSize: 9 }}>
            AM
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Ali Müşavir</span>
          <ChevronDown style={{ width: 12, height: 12, color: "#9ca3af" }} />
        </button>
      </div>
    </header>
  );
}
