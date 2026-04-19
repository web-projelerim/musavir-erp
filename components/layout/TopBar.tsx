"use client";

import { useState } from "react";
import { Bell, Search, ChevronDown, X } from "lucide-react";
import { MOCK_BILDIRIMLER } from "@/lib/data/mock";
import { formatSureGecmis } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function TopBar() {
  const [showNotif, setShowNotif] = useState(false);
  const okunmamis = MOCK_BILDIRIMLER.filter((b) => b.durum === "okunmamis").length;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Arama */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-72">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Müşteri, VKN, görev ara..."
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
        />
        <kbd className="text-xs text-slate-400 border border-slate-200 rounded px-1 py-0.5 font-mono">⌘K</kbd>
      </div>

      {/* Sağ taraf */}
      <div className="flex items-center gap-3">
        {/* Bildirim */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" />
            {okunmamis > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">Bildirimler</span>
                <div className="flex items-center gap-2">
                  {okunmamis > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                      {okunmamis} yeni
                    </span>
                  )}
                  <button onClick={() => setShowNotif(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {MOCK_BILDIRIMLER.map((bil) => (
                  <div
                    key={bil.id}
                    className={cn(
                      "px-4 py-3 hover:bg-slate-50 cursor-pointer",
                      bil.durum === "okunmamis" && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {bil.durum === "okunmamis" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      )}
                      <div className={bil.durum === "okundu" ? "ml-3.5" : ""}>
                        <p className="text-xs font-semibold text-slate-800">{bil.baslik}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{bil.mesaj}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatSureGecmis(bil.tarih)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100">
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Tümünü gör
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profil */}
        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">AM</span>
          </div>
          <span className="text-sm font-medium text-slate-700">Ali Müşavir</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
