"use client";

import { useState } from "react";
import { Bell, Search, ChevronDown, X, Menu } from "lucide-react";
import Link from "next/link";
import { formatSureGecmis } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updateBildirimDurum } from "@/lib/firebase/repositories";
import { useToast } from "@/lib/context/ToastContext";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { bildirimler, musteriler, gorevler, raporlar } = useAppData();
  const { user } = useAuth();
  const toast = useToast();
  const okunmamis = bildirimler.filter((b) => b.durum === "okunmamis").length;
  const initials = user ? `${user.ad[0] ?? ""}${user.soyad[0] ?? ""}` : "AM";
  const query = searchText.trim().toLowerCase();
  const showSearchResults = query.length >= 2;
  const musteriSonuclari = showSearchResults
    ? musteriler.filter((m) =>
        m.firmaAdi.toLowerCase().includes(query) ||
        m.vknTckn.includes(query) ||
        m.yetkiliAd.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];
  const gorevSonuclari = showSearchResults
    ? gorevler.filter((g) =>
        g.baslik.toLowerCase().includes(query) ||
        g.musteriAdi.toLowerCase().includes(query)
      ).slice(0, 3)
    : [];
  const raporSonuclari = showSearchResults
    ? raporlar.filter((r) =>
        r.musteriAdi.toLowerCase().includes(query) ||
        r.donem.toLowerCase().includes(query) ||
        r.tip.toLowerCase().includes(query)
      ).slice(0, 3)
    : [];
  const toplamSonuc = musteriSonuclari.length + gorevSonuclari.length + raporSonuclari.length;

  const handleBildirimOku = async (id: string) => {
    if (!isFirebaseConfigured) return;

    try {
      await updateBildirimDurum(id, "okundu");
    } catch (error) {
      console.error(error);
      toast.error("Bildirim güncellenemedi");
    }
  };

  const handleTumunuOku = async () => {
    const okunmamisBildirimler = bildirimler.filter((b) => b.durum === "okunmamis");

    if (!isFirebaseConfigured) {
      toast.info("Demo modu", "Firebase env girilince bildirim okundu durumları Firestore'a kaydedilecek");
      return;
    }

    try {
      await Promise.all(okunmamisBildirimler.map((b) => updateBildirimDurum(b.id, "okundu")));
      toast.success("Bildirimler okundu olarak işaretlendi");
    } catch (error) {
      console.error(error);
      toast.error("Bildirimler güncellenemedi");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Arama */}
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Müşteri, VKN, görev ara..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"
        />
        <kbd className="hidden text-xs text-slate-400 border border-slate-200 rounded px-1 py-0.5 font-mono sm:inline">⌘K</kbd>
        </div>

        {showSearchResults && (
          <div className="absolute left-0 top-full z-50 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {toplamSonuc === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">Sonuç bulunamadı</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {musteriSonuclari.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Müşteriler</p>
                    {musteriSonuclari.map((m) => (
                      <Link
                        key={m.id}
                        href={`/musteriler/${m.id}`}
                        onClick={() => setSearchText("")}
                        className="block px-4 py-2 hover:bg-slate-50"
                      >
                        <p className="text-xs font-semibold text-slate-800">{m.firmaAdi}</p>
                        <p className="text-xs text-slate-400 font-mono">{m.vknTckn}</p>
                      </Link>
                    ))}
                  </div>
                )}
                {gorevSonuclari.length > 0 && (
                  <div className="py-2 border-t border-slate-100">
                    <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Görevler</p>
                    {gorevSonuclari.map((g) => (
                      <Link
                        key={g.id}
                        href="/gorevler"
                        onClick={() => setSearchText("")}
                        className="block px-4 py-2 hover:bg-slate-50"
                      >
                        <p className="text-xs font-semibold text-slate-800">{g.baslik}</p>
                        <p className="text-xs text-slate-400">{g.musteriAdi}</p>
                      </Link>
                    ))}
                  </div>
                )}
                {raporSonuclari.length > 0 && (
                  <div className="py-2 border-t border-slate-100">
                    <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Raporlar</p>
                    {raporSonuclari.map((r) => (
                      <Link
                        key={r.id}
                        href="/raporlar"
                        onClick={() => setSearchText("")}
                        className="block px-4 py-2 hover:bg-slate-50"
                      >
                        <p className="text-xs font-semibold text-slate-800">{r.musteriAdi}</p>
                        <p className="text-xs text-slate-400">{r.tip.replace("_", " ")} · {r.donem}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
                {bildirimler.map((bil) => (
                  <div
                    key={bil.id}
                    onClick={() => handleBildirimOku(bil.id)}
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
                <button
                  onClick={handleTumunuOku}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Tümünü okundu işaretle
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profil */}
        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">
            {user ? `${user.ad} ${user.soyad}` : "Ali Müşavir"}
          </span>
          <ChevronDown className="hidden w-3.5 h-3.5 text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  );
}
