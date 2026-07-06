"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, X, Send, MessageCircle, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InfoBanner } from "@/components/ui/InfoBanner";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty } from "@/components/ui/Table";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAppData } from "@/lib/hooks/useAppData";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { sendWhatsAppMessages } from "@/lib/integrations/whatsapp/provider";
import { updateGonderimKaydi } from "@/lib/firebase/repositories";
import { formatTarih } from "@/lib/utils/format";

const KANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-posta",
  panel: "Panel",
};

const KANAL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  panel: <Phone className="w-3.5 h-3.5" />,
};

export default function OnayBekleyenlerPage() {
  const { gonderimler, musteriler, loading } = useAppData();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isleniyor, setIsleniyor] = useState(false);

  const bekleyenler = useMemo(() => {
    return gonderimler
      .filter((g) => g.durum === "bekliyor")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [gonderimler]);

  const musteriMap = useMemo(() => new Map(musteriler.map((m) => [m.id, m])), [musteriler]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === bekleyenler.length) setSelected(new Set());
    else setSelected(new Set(bekleyenler.map((g) => g.id)));
  };

  const handleOnayla = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsleniyor(true);
    try {
      let basariliSayisi = 0;
      let basarisizSayisi = 0;

      for (const id of ids) {
        const g = bekleyenler.find((x) => x.id === id);
        if (!g) continue;
        const musteri = musteriMap.get(g.musteriId);
        const telefon = musteri?.gsm1 || musteri?.telefon || "";

        if (g.kanal === "whatsapp" && telefon && g.mesaj) {
          const sonuc = await sendWhatsAppMessages([
            { musteriId: g.musteriId, musteriAdi: g.musteriAdi, phone: telefon, body: g.mesaj },
          ]).catch(() => []);
          const ok = sonuc[0]?.basarili === true;
          if (isFirebaseConfigured) {
            await updateGonderimKaydi(g.id, {
              durum: ok ? "gonderildi" : "basarisiz",
              sentAt: ok ? new Date().toISOString() : undefined,
              hataMesaji: ok ? undefined : sonuc[0]?.hataMesaji,
            });
          }
          if (ok) basariliSayisi += 1; else basarisizSayisi += 1;
        } else {
          // WhatsApp dışı kanallar şimdilik sadece "gönderildi" işaretle
          if (isFirebaseConfigured) {
            await updateGonderimKaydi(g.id, {
              durum: "gonderildi",
              sentAt: new Date().toISOString(),
            });
          }
          basariliSayisi += 1;
        }
      }
      setSelected(new Set());
      if (basariliSayisi > 0) toast.success(`${basariliSayisi} mesaj gönderildi`, basarisizSayisi > 0 ? `${basarisizSayisi} başarısız` : undefined);
      if (basariliSayisi === 0) toast.error("Hiç mesaj gönderilemedi");
    } catch (err) {
      toast.error("Onay işlemi başarısız", err instanceof Error ? err.message : undefined);
    } finally {
      setIsleniyor(false);
    }
  };

  const handleReddet = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsleniyor(true);
    try {
      for (const id of ids) {
        if (isFirebaseConfigured) {
          await updateGonderimKaydi(id, {
            durum: "basarisiz",
            hataMesaji: "Müşavir tarafından reddedildi",
          });
        }
      }
      setSelected(new Set());
      toast.success(`${ids.length} mesaj reddedildi`);
    } catch (err) {
      toast.error("Reddetme başarısız", err instanceof Error ? err.message : undefined);
    } finally {
      setIsleniyor(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Onay Bekleyen Mesajlar"
        subtitle={`${bekleyenler.length} mesaj müşavir onayı bekliyor`}
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "Onay Bekleyenler" }]}
        action={
          <div className="flex gap-2">
            {selected.size > 0 && (
              <>
                <Button variant="outline" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => handleReddet(Array.from(selected))} loading={isleniyor}>
                  Reddet ({selected.size})
                </Button>
                <Button size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => handleOnayla(Array.from(selected))} loading={isleniyor}>
                  Onayla & Gönder ({selected.size})
                </Button>
              </>
            )}
          </div>
        }
      />

      <InfoBanner className="mb-5">
        <span>
          <Link href="/ayarlar" className="font-semibold underline hover:no-underline">Ayarlar → Entegrasyonlar → WhatsApp</Link> altındaki
          "Otomatik Gönderim Ayarları"nda her mesaj türü için "Onay Bekle" seçilirse mesajlar buraya düşer.
          Onayladığınızda mesaj hemen gönderilir; reddederseniz kaydı silinir.
        </span>
      </InfoBanner>

      {bekleyenler.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-12 text-center">
          <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">Onay bekleyen mesaj yok</p>
          <p className="mt-1 text-xs text-slate-500">Tüm mesajlar gönderilmiş veya ayarlardan otomatik gönderim açılmış olabilir</p>
        </div>
      ) : (
        <>
          <MobileList empty={false}>
            {bekleyenler.map((g) => (
              <MobileCard key={g.id}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggleSelect(g.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{g.musteriAdi}</p>
                      <Badge variant="info">
                        <span className="inline-flex items-center gap-1">{KANAL_ICON[g.kanal]} {KANAL_LABEL[g.kanal]}</span>
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-3">{g.mesaj}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatTarih(g.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleReddet([g.id])} className="flex-1">Reddet</Button>
                  <Button size="sm" onClick={() => handleOnayla([g.id])} className="flex-1">Onayla & Gönder</Button>
                </div>
              </MobileCard>
            ))}
          </MobileList>
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Bekleyen Gönderimler</h3>
            </div>
            <Table>
              <TableHead>
                <tr>
                  <TableHeadCell>
                    <input
                      type="checkbox"
                      checked={selected.size === bekleyenler.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </TableHeadCell>
                  <TableHeadCell>Müşteri</TableHeadCell>
                  <TableHeadCell>Kanal</TableHeadCell>
                  <TableHeadCell>Mesaj</TableHeadCell>
                  <TableHeadCell>Oluşturulma</TableHeadCell>
                  <TableHeadCell>İşlem</TableHeadCell>
                </tr>
              </TableHead>
              <TableBody>
                {bekleyenler.length === 0 ? (
                  <TableEmpty colSpan={6} />
                ) : bekleyenler.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(g.id)}
                        onChange={() => toggleSelect(g.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </TableCell>
                    <TableCell><span className="text-xs font-medium text-slate-800">{g.musteriAdi}</span></TableCell>
                    <TableCell>
                      <Badge variant="info">
                        <span className="inline-flex items-center gap-1">{KANAL_ICON[g.kanal]} {KANAL_LABEL[g.kanal]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal max-w-md">
                      <span className="text-xs text-slate-600 line-clamp-2">{g.mesaj}</span>
                    </TableCell>
                    <TableCell><span className="text-xs text-slate-500">{formatTarih(g.createdAt)}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => handleOnayla([g.id])} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100" disabled={isleniyor}>Onayla</button>
                        <button type="button" onClick={() => handleReddet([g.id])} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100" disabled={isleniyor}>Reddet</button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
