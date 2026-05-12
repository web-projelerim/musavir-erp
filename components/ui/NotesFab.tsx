"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, Trash2, ChevronDown, Users, PencilOff, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { subscribeNotlarByCreator, subscribeNotlarByEmail, tikleNot, untikleNot } from "@/lib/firebase/firestore";
import { createNot, deleteNot } from "@/lib/firebase/repositories";
import { getOfisId } from "@/lib/domain/office";
import type { Not, NotRenk } from "@/lib/types";

/** Her zaman bu e-postalar yeni notları görebilir */
const PAYLASIM_EMAILS = ["aslanaysenur063@gmail.com"];

const RENKLER: { value: NotRenk; bg: string; border: string; dot: string; label: string }[] = [
  { value: "sari",  bg: "bg-yellow-50",  border: "border-yellow-300", dot: "bg-yellow-400", label: "Sarı"   },
  { value: "mavi",  bg: "bg-blue-50",    border: "border-blue-300",   dot: "bg-blue-400",   label: "Mavi"   },
  { value: "yesil", bg: "bg-emerald-50", border: "border-emerald-300",dot: "bg-emerald-400",label: "Yeşil"  },
  { value: "pembe", bg: "bg-pink-50",    border: "border-pink-300",   dot: "bg-pink-400",   label: "Pembe"  },
];

const MAX_ICERIK = 500;

function renkStyle(renk: NotRenk) {
  return RENKLER.find((r) => r.value === renk) ?? RENKLER[0];
}

function formatZaman(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const dk = Math.floor(diff / 60000);
  if (dk < 1)  return "Az önce";
  if (dk < 60) return `${dk} dk önce`;
  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} saat önce`;
  const gun = Math.floor(saat / 24);
  if (gun === 1) return "Dün";
  if (gun < 7)  return `${gun} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function AdAvatar({ ad, kendi }: { ad: string; kendi: boolean }) {
  const harf = ad
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0",
        kendi
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-500"
      )}
      title={ad}
    >
      {harf}
    </span>
  );
}

export function NotesFab() {
  const { user } = useAuth();
  const toast = useToast();
  // useAppData().notlar artık kullanılmıyor — notlar sadece kendi UID veya paylaşılan email ile gelir

  const [panelAcik, setPanelAcik] = useState(false);
  const [yazmaAcik, setYazmaAcik] = useState(false);
  const [icerik, setIcerik] = useState("");
  const [seciliRenk, setSeciliRenk] = useState<NotRenk>("sari");
  const [filtre, setFiltre] = useState<NotRenk | "hepsi">("hepsi");
  const [kayit, setKayit] = useState(false);
  const [kendiNotlar, setKendiNotlar] = useState<Not[]>([]);
  const [paylasilanNotlar, setPaylasilanNotlar] = useState<Not[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sadece kendi yazdığı notları al (createdBy == uid)
  useEffect(() => {
    if (!user?.id || !isFirebaseConfigured) return;
    const unsub = subscribeNotlarByCreator<Not>(user.id, (data) => {
      setKendiNotlar(data);
    });
    return unsub;
  }, [user?.id]);

  // Paylaşılan notları ayrı abone ile al (paylasilanEmails'de email varsa)
  useEffect(() => {
    if (!user?.email || !isFirebaseConfigured) return;
    const unsub = subscribeNotlarByEmail<Not>(user.email, (data) => {
      setPaylasilanNotlar(data);
    });
    return unsub;
  }, [user?.email]);

  useEffect(() => {
    if (yazmaAcik) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      setIcerik("");
    }
  }, [yazmaAcik]);

  useEffect(() => {
    if (!yazmaAcik) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-notes-write]")) {
        setYazmaAcik(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [yazmaAcik]);

  const handleKaydet = async () => {
    if (!icerik.trim() || icerik.length > MAX_ICERIK) return;
    setKayit(true);
    try {
      const yeni: Not = {
        id: `not-local-${Date.now()}`,
        ofisId: getOfisId(user?.ofisId),
        icerik: icerik.trim(),
        renk: seciliRenk,
        createdBy: user?.id ?? "demo",
        createdByName: user ? `${user.ad} ${user.soyad}` : "Demo",
        createdAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        // Firebase modunda optimistik güncelleme yapma — onSnapshot zaten güncelleyecek
        await createNot({
          ofisId: yeni.ofisId,
          icerik: yeni.icerik,
          renk: yeni.renk,
          createdBy: yeni.createdBy,
          createdByName: yeni.createdByName,
          paylasilanEmails: PAYLASIM_EMAILS,
        });
      } else {
        setKendiNotlar((prev) => [yeni, ...prev]);
      }

      setIcerik("");
      setYazmaAcik(false);
      toast.success("Not kaydedildi");
    } catch {
      toast.error("Not kaydedilemedi");
    } finally {
      setKayit(false);
    }
  };

  const handleSil = async (id: string) => {
    setKendiNotlar((prev) => prev.filter((n: Not) => n.id !== id));
    if (isFirebaseConfigured && !id.startsWith("not-local-")) {
      try {
        await deleteNot(id);
      } catch {
        toast.error("Not silinemedi");
      }
    }
  };

  // Kendi notlar + paylaşılan notları birleştir (duplicate'i id'ye göre kaldır)
  const tumNotlar = [...kendiNotlar, ...paylasilanNotlar].filter(
    (not, index, self) => self.findIndex((n) => n.id === not.id) === index
  );

  const sortedNotlar = [...tumNotlar]
    .filter((n) => filtre === "hepsi" || n.renk === filtre)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const kalanKarakter = MAX_ICERIK - icerik.length;

  return (
    <>
      {/* Alt panel — tüm notlar */}
      {panelAcik && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-2xl lg:left-60">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-800">Ofis Notları</span>
              {tumNotlar.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {tumNotlar.length}
                </span>
              )}
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 ml-1">
                <Users className="h-3 w-3" />
                Sadece siz ve paylaşılanlar
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Renk filtresi */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFiltre("hepsi")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                    filtre === "hepsi"
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  Hepsi
                </button>
                {RENKLER.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setFiltre(filtre === r.value ? "hepsi" : r.value)}
                    title={r.label}
                    className={cn(
                      "h-4 w-4 rounded-full transition-transform",
                      r.dot,
                      filtre === r.value ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setYazmaAcik(true); setPanelAcik(false); setFiltre("hepsi"); }}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                + Not Ekle
              </button>
              <button
                type="button"
                onClick={() => { setPanelAcik(false); setFiltre("hepsi"); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {sortedNotlar.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Pencil className="mb-2 h-6 w-6 opacity-40" />
                <p className="text-sm">
                  {filtre !== "hepsi" ? "Bu renkte not yok" : "Henüz not yok"}
                </p>
                {filtre === "hepsi" && (
                  <button
                    type="button"
                    onClick={() => { setYazmaAcik(true); setPanelAcik(false); setFiltre("hepsi"); }}
                    className="mt-2 text-xs text-amber-600 hover:underline"
                  >
                    İlk notu ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedNotlar.map((not) => {
                  const stil = renkStyle(not.renk);
                  const kendi = not.createdBy === (user?.id ?? "demo");
                  const tikleyenler = not.tikleyenler ?? [];
                  const benimTikim = tikleyenler.some((t) => t.email === user?.email);

                  const handleTikle = async () => {
                    if (!user?.email || !isFirebaseConfigured) return;
                    try {
                      if (benimTikim) {
                        // Kendi tikini kaldır
                        await untikleNot(not.id, tikleyenler, user.email);
                      } else {
                        await tikleNot(not.id, {
                          email: user.email,
                          ad: `${user.ad} ${user.soyad}`.trim(),
                          tarih: new Date().toISOString(),
                        });
                      }
                    } catch {
                      toast.error(benimTikim ? "Onay kaldırılamadı" : "Onay kaydedilemedi");
                    }
                  };

                  return (
                    <div
                      key={not.id}
                      className={cn(
                        "group relative rounded-xl border p-3",
                        stil.bg,
                        stil.border
                      )}
                    >
                      {/* Sil butonu — sadece kendi notunda hover'da görünür */}
                      <button
                        type="button"
                        onClick={() => handleSil(not.id)}
                        className={cn(
                          "absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white/70 hover:text-red-500 transition-colors",
                          kendi && "group-hover:flex"
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Not içeriği — tiklenseydi üstü çizili DEĞİL */}
                      <p className="pr-6 text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                        {not.icerik}
                      </p>

                      {/* Alt kısım: yazar + zaman + tik butonu */}
                      <div className="mt-2.5 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AdAvatar ad={not.createdByName} kendi={kendi} />
                          <span className="text-[10px] text-slate-500 font-medium truncate">
                            {kendi ? "Siz" : not.createdByName}
                          </span>
                          <span className="text-[10px] text-slate-400">·</span>
                          <span className="text-[10px] text-slate-400">{formatZaman(not.createdAt)}</span>
                        </div>

                        {/* Tik butonu — sadece kendi tikini toggle edebilir */}
                        <button
                          type="button"
                          onClick={handleTikle}
                          title={benimTikim ? "Onayınızı kaldırmak için tıklayın" : "Onayladım"}
                          className={cn(
                            "flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                            benimTikim
                              ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600"
                              : "border-slate-300 text-slate-300 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Tikleyenler listesi — sadece tikleme varsa göster */}
                      {tikleyenler.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tikleyenler.map((t) => (
                            <span
                              key={t.email}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                            >
                              <Check className="h-2.5 w-2.5" />
                              {t.ad}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Not yazma popup */}
      {yazmaAcik && (
        <div
          data-notes-write
          className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <span className="text-sm font-semibold text-slate-800">Yeni Not</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] text-slate-400">Sadece siz ve paylaşılanlar</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setYazmaAcik(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={icerik}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_ICERIK) setIcerik(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleKaydet();
                  }
                }}
                placeholder="Notunuzu yazın..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
              <span
                className={cn(
                  "absolute bottom-2 right-2 text-[10px]",
                  kalanKarakter < 50 ? "text-red-400 font-semibold" : "text-slate-300"
                )}
              >
                {kalanKarakter}
              </span>
            </div>

            {/* Renk seçimi */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 flex-shrink-0">Renk:</span>
              <div className="flex items-center gap-2">
                {RENKLER.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSeciliRenk(r.value)}
                    title={r.label}
                    className={cn(
                      "h-5 w-5 rounded-full transition-transform",
                      r.dot,
                      seciliRenk === r.value ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"
                    )}
                  />
                ))}
                <span className="text-[10px] text-slate-400 ml-1">
                  {RENKLER.find((r) => r.value === seciliRenk)?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[10px] text-slate-400">Enter · Shift+Enter yeni satır</p>
              <button
                type="button"
                onClick={handleKaydet}
                disabled={!icerik.trim() || kayit || icerik.length > MAX_ICERIK}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {kayit ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB buton */}
      <button
        type="button"
        onClick={() => {
          if (panelAcik) {
            setPanelAcik(false);
            setFiltre("hepsi");
          } else if (yazmaAcik) {
            setYazmaAcik(false);
          } else {
            setYazmaAcik(true);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setPanelAcik((v) => !v);
          setYazmaAcik(false);
        }}
        title={panelAcik || yazmaAcik ? "Kapat" : "Not ekle (Sağ tık: tüm notlar)"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 active:scale-95",
          panelAcik || yazmaAcik ? "bg-slate-600 hover:bg-slate-700" : "bg-amber-400 hover:bg-amber-500"
        )}
      >
        {panelAcik || yazmaAcik ? (
          <PencilOff className="h-5 w-5" />
        ) : (
          <Pencil className="h-5 w-5" />
        )}
        {tumNotlar.length > 0 && !panelAcik && !yazmaAcik && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {tumNotlar.length > 9 ? "9+" : tumNotlar.length}
          </span>
        )}
      </button>

      {/* Panel açma butonu */}
      {!panelAcik && !yazmaAcik && tumNotlar.length > 0 && (
        <button
          type="button"
          onClick={() => setPanelAcik(true)}
          className="fixed bottom-6 right-20 z-50 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-md hover:bg-amber-50 hover:text-amber-700 transition-colors"
        >
          <Pencil className="h-3 w-3" />
          {tumNotlar.length} not
        </button>
      )}
    </>
  );
}
