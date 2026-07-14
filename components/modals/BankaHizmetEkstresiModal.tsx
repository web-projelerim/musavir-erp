"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createBankaEkstresi,
  createOdeme,
  createTahsilat,
  updateTahsilat,
  updateTahakkukDurum,
  updateMusteri,
} from "@/lib/firebase/repositories";
import { parseBankaEkstresiFile, matchBankaSatirlari } from "@/lib/domain/bankaEsleme";
import { getOfisId } from "@/lib/domain/office";
import { tahakkukKalemLabel } from "@/lib/domain/tahakkuk";
import { formatPara } from "@/lib/utils/format";
import type { BankaEkstreSatiri } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (matched: BankaEkstreSatiri[]) => void;
}

type Asama = "yukle" | "ozet" | "manuel" | "gonderenler";

interface ManuelEslestirme {
  rowId: string;
  musteriId: string;
  tahakkukId: string;
}

interface GonderenKayit {
  rowId: string;
  gonderen: string;
  musteriId: string;
  musteriAdi: string;
  secili: boolean;
}

function periodFromDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function BankaHizmetEkstresiModal({ open, onClose, onSuccess }: Props) {
  const { musteriler, tahakkuklar, tahsilatlar } = useAppData();
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BankaEkstreSatiri[]>([]);
  const [loading, setLoading] = useState(false);
  const [asama, setAsama] = useState<Asama>("yukle");
  const [manuelEslestirmeler, setManuelEslestirmeler] = useState<ManuelEslestirme[]>([]);
  const [gonderenKayitlar, setGonderenKayitlar] = useState<GonderenKayit[]>([]);

  // Sadece hizmet tahakkukları
  const hizmetTahakkuklar = tahakkuklar.filter((t) => t.tahakkukTuru === "hizmet");

  const matched = rows.filter((row) => row.durum === "eslesti");
  const unmatched = rows.filter((row) => row.durum === "eslesmedi");
  // Orta güvenli otomatik eşleşmeler — mali müşavir onayı bekler, onaysız KAYDEDİLMEZ
  const onayBekleyen = rows.filter((row) => row.durum === "onay_bekliyor");

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const rawRows = await parseBankaEkstresiFile(file);
      if (rawRows.length === 0) {
        // Format tanınmadı — boş "özet" aşamasına geçip sessizce boş kayıt yapma
        toast.warning(
          "Hiç satır okunamadı",
          "Dosya formatı tanınmadı. Lütfen tarih/açıklama/tutar sütunları olan bir ekstre yükleyin."
        );
        return;
      }
      // Sadece hizmet tahakkuklarıyla eşleştir
      const matched = matchBankaSatirlari(rawRows, musteriler, hizmetTahakkuklar);
      setRows(matched);
      setFileName(file.name);
      setAsama("ozet");
      setManuelEslestirmeler([]);
      setGonderenKayitlar([]);
    } catch (error) {
      console.error(error);
      toast.error("Banka ekstresi okunamadı", error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleManuelMusteriDegis = (rowId: string, musteriId: string) => {
    setManuelEslestirmeler((prev) => {
      const existing = prev.find((m) => m.rowId === rowId);
      if (existing) {
        return prev.map((m) => m.rowId === rowId ? { ...m, musteriId, tahakkukId: "" } : m);
      }
      return [...prev, { rowId, musteriId, tahakkukId: "" }];
    });
  };

  const handleManuelTahakkukDegis = (rowId: string, tahakkukId: string) => {
    setManuelEslestirmeler((prev) => {
      const existing = prev.find((m) => m.rowId === rowId);
      if (existing) {
        return prev.map((m) => m.rowId === rowId ? { ...m, tahakkukId } : m);
      }
      return [...prev, { rowId, musteriId: "", tahakkukId }];
    });
  };

  const handleManuelEslestir = (rowId: string) => {
    const me = manuelEslestirmeler.find((m) => m.rowId === rowId);
    if (!me || !me.tahakkukId) return;
    const tahakkuk = hizmetTahakkuklar.find((t) => t.id === me.tahakkukId);
    if (!tahakkuk) return;

    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              musteriId: tahakkuk.musteriId,
              musteriAdi: tahakkuk.musteriAdi,
              tahakkukId: tahakkuk.id,
              tahakkukTuru: tahakkuk.tahakkukTuru,
              odemeSinifi: tahakkuk.tahakkukTuru,
              eslesenTahakkukEtiketi: tahakkukKalemLabel(tahakkuk),
              // Manuel seçim = açık onaydır → doğrudan "eslesti" (kaydedilir)
              durum: "eslesti" as BankaEkstreSatiri["durum"],
              uyarilar: ["Manuel eşleştirildi"],
            }
          : row
      )
    );
  };

  /** Onay bekleyen otomatik eşleşmeyi mali müşavir onaylar → kaydedilecekler listesine girer */
  const handleOnayla = (rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId && row.durum === "onay_bekliyor"
          ? { ...row, durum: "eslesti" as BankaEkstreSatiri["durum"], uyarilar: ["Onaylandı"] }
          : row
      )
    );
  };

  /** Onay bekleyen eşleşmeyi reddet → manuel eşleştirme için "eşleşmedi"ye düşür */
  const handleReddet = (rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              musteriId: undefined,
              musteriAdi: undefined,
              tahakkukId: undefined,
              tahakkukTuru: undefined,
              eslesenTahakkukEtiketi: undefined,
              durum: "eslesmedi" as BankaEkstreSatiri["durum"],
              uyarilar: ["Reddedildi — manuel eşleştirin"],
            }
          : row
      )
    );
  };

  const handleOzetDevam = () => {
    if (unmatched.length === 0 && onayBekleyen.length === 0) {
      // İncelenecek/eşleştirilecek satır yok — gönderenler aşamasına geç
      hazirlaGonderenler();
    } else {
      setAsama("manuel");
    }
  };

  const hazirlaGonderenler = () => {
    // Manuel eşleştirilen satırlar için gönderen kayıt listesi oluştur
    const manuelEslenenRows = rows.filter((row) => {
      const me = manuelEslestirmeler.find((m) => m.rowId === row.id);
      return me && me.tahakkukId && row.gonderen && row.gonderen.trim().length > 0;
    });

    const liste: GonderenKayit[] = manuelEslenenRows.map((row) => {
      const me = manuelEslestirmeler.find((m) => m.rowId === row.id)!;
      const tahakkuk = hizmetTahakkuklar.find((t) => t.id === me.tahakkukId);
      const musteri = musteriler.find((m) => m.id === (tahakkuk?.musteriId ?? me.musteriId));
      return {
        rowId: row.id,
        gonderen: row.gonderen ?? "",
        musteriId: musteri?.id ?? "",
        musteriAdi: musteri?.firmaAdi ?? "",
        secili: true,
      };
    }).filter((k) => k.musteriId && k.gonderen);

    setGonderenKayitlar(liste);
    setAsama(liste.length > 0 ? "gonderenler" : "yukle");

    if (liste.length === 0) {
      // Gönderenler yoksa direkt kaydet
      handleKaydet([]);
    }
  };

  const handleManuelDevam = () => {
    hazirlaGonderenler();
  };

  const handleGonderenToggle = (rowId: string) => {
    setGonderenKayitlar((prev) =>
      prev.map((k) => k.rowId === rowId ? { ...k, secili: !k.secili } : k)
    );
  };

  const handleKaydet = async (seciliGonderenler: GonderenKayit[]) => {
    setLoading(true);
    try {
      // Yalnızca onaylanmış (eslesti) satırlar kaydedilir — onay bekleyenler
      // mali müşavir onayı almadan yazılmaz.
      const tumEslesen = rows.filter((row) => row.durum === "eslesti");

      if (isFirebaseConfigured) {
        const ekstre = await createBankaEkstresi({
          ofisId: getOfisId(user?.ofisId),
          dosyaAdi: fileName,
          donem: periodFromDate(),
          satirSayisi: rows.length,
          eslesenSayisi: matched.length,
          onayBekleyenSayisi: rows.filter((r) => r.durum === "onay_bekliyor").length,
          eslesmeyenSayisi: rows.filter((r) => r.durum === "eslesmedi").length,
          duplicateSayisi: rows.filter((r) => r.uyarilar?.some((u) => u.includes("dekont"))).length,
          satirlar: rows,
          createdBy: user?.id ?? "system",
        });

        for (const row of tumEslesen) {
          await createOdeme({
            ofisId: getOfisId(user?.ofisId),
            musteriId: row.musteriId,
            musteriAdi: row.musteriAdi,
            tahakkukId: row.tahakkukId,
            tahakkukTuru: row.tahakkukTuru,
            tutar: row.tutar,
            odemeTarihi: row.tarih,
            bankaAciklamasi: row.aciklama,
            iban: row.iban,
            dekontNo: row.dekontNo,
            eslesmeSkoru: row.eslesmeSkoru,
            durum: "eslesti",
            kaynak: "banka",
            ekstreId: ekstre.id,
          });
          const tahakkuk = hizmetTahakkuklar.find((t) => t.id === row.tahakkukId);
          if (tahakkuk) {
            const paid = (tahakkuk.odenenTutar ?? 0) + row.tutar;
            const yeniDurum = paid >= tahakkuk.tutar ? "odendi" : "kismi";
            await updateTahakkukDurum(tahakkuk.id, yeniDurum, paid);

            // Tahsilat kaydı — /tahsilatlar sayfası ayrı `tahsilatlar` koleksiyonundan
            // beslenir; eşleşen ödeme burada görünsün diye kaydı upsert et.
            const mevcutTahsilat = tahsilatlar.find((t) => t.tahakkukId === tahakkuk.id);
            if (mevcutTahsilat) {
              await updateTahsilat(mevcutTahsilat.id, {
                odenenTutar: paid,
                odemeTarihi: row.tarih,
                durum: yeniDurum,
              });
            } else {
              await createTahsilat({
                ofisId: getOfisId(user?.ofisId),
                tahakkukId: tahakkuk.id,
                musteriId: tahakkuk.musteriId,
                musteriAdi: tahakkuk.musteriAdi,
                tutar: tahakkuk.tutar,
                odenenTutar: paid,
                donem: tahakkuk.donem,
                vadeTarihi: tahakkuk.vadeTarihi,
                odemeTarihi: row.tarih,
                durum: yeniDurum,
              });
            }
          }
        }

        // Seçili gönderenleri mükellef kartına kaydet
        for (const gonderen of seciliGonderenler) {
          if (!gonderen.secili || !gonderen.musteriId || !gonderen.gonderen) continue;
          const musteri = musteriler.find((m) => m.id === gonderen.musteriId);
          if (!musteri) continue;
          const mevcutlar = musteri.bankaGonderenAdlari ?? [];
          if (!mevcutlar.includes(gonderen.gonderen)) {
            await updateMusteri(gonderen.musteriId, {
              bankaGonderenAdlari: [...mevcutlar, gonderen.gonderen],
            });
          }
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onSuccess?.(tumEslesen);
      }

      await logAudit({
        action: "match",
        entityType: "banka_ekstresi",
        entityId: fileName || `ekstre-${Date.now()}`,
        entityLabel: fileName,
        summary: `Hizmet ekstresi: ${tumEslesen.length} eşleşme kaydedildi, ${seciliGonderenler.filter((g) => g.secili).length} gönderen mükellef kartına eklendi`,
        after: {
          eslesen: tumEslesen.length,
          eslesmemi: rows.filter((r) => r.durum === "eslesmedi").length,
          gonderenKaydedilen: seciliGonderenler.filter((g) => g.secili).length,
        },
      });

      toast.success("Hizmet ekstresi işlendi", `${tumEslesen.length} eşleşme kaydedildi`);
      handleReset();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Ekstre kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRows([]);
    setFileName("");
    setAsama("yukle");
    setManuelEslestirmeler([]);
    setGonderenKayitlar([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Banka Hizmet Ekstresi Yükle" size="xl">
      <div className="space-y-4">

        {/* ── Aşama 0: Dosya yükle ── */}
        {asama === "yukle" && (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-blue-300 hover:bg-blue-50/40">
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              {loading ? "Dosya işleniyor..." : "Banka ekstresi seçin"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Sadece hizmet tahakkuklarıyla eşleştirilir · xlsx, xls, csv, pdf
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}

        {/* ── Aşama 1: Özet ── */}
        {asama === "ozet" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">Eşleştirme Özeti</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Toplam satır</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{matched.length}</p>
                  <p className="text-xs text-emerald-600 mt-1">Otomatik eşleşti</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {rows.filter((r) => r.durum === "onay_bekliyor").length}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Onay bekleyen</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{unmatched.length}</p>
                  <p className="text-xs text-red-600 mt-1">Eşleşmedi</p>
                </div>
              </div>
              {unmatched.length > 0 && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {unmatched.length} satır eşleşmedi. Devam ederek bunları manuel olarak eşleştirebilirsiniz.
                </p>
              )}
              {matched.length > 0 && (
                <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Toplam eşleşen tutar: {formatPara(matched.reduce((s, r) => s + r.tutar, 0))}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => setAsama("yukle")}>
                Geri
              </Button>
              <Button onClick={handleOzetDevam}>
                {unmatched.length > 0 || onayBekleyen.length > 0 ? "İncele ve Eşleştir" : "Kaydet"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Aşama 2: İncele ve Manuel Eşleştir ── */}
        {asama === "manuel" && (
          <div className="space-y-4">
            {/* Onay bekleyen otomatik eşleşmeler — mali müşavir onayına sunulur */}
            {onayBekleyen.length > 0 && (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Onay Bekleyen Eşleşmeler</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Orta güvenli otomatik eşleşmeler. Onaylamazsanız kaydedilmez.
                  </p>
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-amber-200 divide-y divide-amber-100">
                  {onayBekleyen.map((row) => (
                    <div key={row.id} className="p-3 bg-amber-50/40">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{row.aciklama}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {row.tarih} · {formatPara(row.tutar)}
                            {row.gonderen ? ` · ${row.gonderen}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-700 mt-1">
                            → <span className="font-semibold">{row.musteriAdi}</span>
                            {row.eslesenTahakkukEtiketi ? ` · ${row.eslesenTahakkukEtiketi}` : ""}
                          </p>
                        </div>
                        <Badge variant="warning" className="flex-shrink-0 text-[10px]">Onay bekliyor</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => handleOnayla(row.id)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          Onayla
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReddet(row.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 transition-colors"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-slate-800">Manuel Eşleştirme</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {unmatched.length > 0
                  ? `Otomatik eşleşmeyen ${unmatched.length} satır için mükellef ve hizmet tahakkuku seçin.`
                  : "Eşleşmeyen satır kalmadı."}
              </p>
            </div>

            <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {unmatched.map((row) => {
                const me = manuelEslestirmeler.find((m) => m.rowId === row.id);
                const secilenMusteriId = me?.musteriId ?? "";
                const musteriyeAitTahakkuklar = hizmetTahakkuklar.filter(
                  (t) => t.musteriId === secilenMusteriId && t.durum !== "odendi" && t.durum !== "iptal"
                );
                return (
                  <div key={row.id} className="p-3 bg-white">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{row.aciklama}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {row.tarih} · {formatPara(row.tutar)}
                          {row.gonderen ? ` · ${row.gonderen}` : ""}
                        </p>
                      </div>
                      <Badge variant="danger" className="flex-shrink-0 text-[10px]">Eşleşmedi</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <select
                        value={secilenMusteriId}
                        onChange={(e) => handleManuelMusteriDegis(row.id, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none col-span-1"
                      >
                        <option value="">Mükellef seçin</option>
                        {musteriler.map((m) => (
                          <option key={m.id} value={m.id}>{m.firmaAdi}</option>
                        ))}
                      </select>

                      <select
                        value={me?.tahakkukId ?? ""}
                        onChange={(e) => handleManuelTahakkukDegis(row.id, e.target.value)}
                        disabled={!secilenMusteriId}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none col-span-1 disabled:opacity-50"
                      >
                        <option value="">Hizmet tahakkuku seçin</option>
                        {musteriyeAitTahakkuklar.map((t) => (
                          <option key={t.id} value={t.id}>
                            {tahakkukKalemLabel(t)} · {t.donem} · {formatPara(t.tutar)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!me?.tahakkukId}
                        onClick={() => handleManuelEslestir(row.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Eşleştir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => setAsama("ozet")}>
                Geri
              </Button>
              <Button onClick={handleManuelDevam}>
                Devam Et
              </Button>
            </div>
          </div>
        )}

        {/* ── Aşama 3: Gönderenler ── */}
        {asama === "gonderenler" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Gönderen Adlarını Kaydet</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Manuel eşleştirilen satırların gönderen adlarını mükellef kartına ekleyerek gelecekteki otomatik eşleşmeyi iyileştirebilirsiniz.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {gonderenKayitlar.map((k) => (
                <label
                  key={k.rowId}
                  className="flex items-center gap-3 p-3 bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={k.secili}
                    onChange={() => handleGonderenToggle(k.rowId)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                      <span className="text-slate-500 font-normal">&ldquo;</span>
                      {k.gonderen}
                      <span className="text-slate-500 font-normal">&rdquo;</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      → <span className="font-medium text-slate-700">{k.musteriAdi}</span> için kaydet
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => setAsama("manuel")}>
                Geri
              </Button>
              <Button loading={loading} onClick={() => handleKaydet(gonderenKayitlar)}>
                Kaydet ve Bitir
              </Button>
            </div>
          </div>
        )}

        {/* İptal butonu — sadece yukle aşamasında göster */}
        {asama === "yukle" && (
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={handleClose}>İptal</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
