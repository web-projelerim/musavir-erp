"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/lib/context/ToastContext";
import { riskMapOlustur } from "@/lib/domain/risk";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAppData } from "@/lib/hooks/useAppData";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createGonderimKaydi } from "@/lib/firebase/repositories";
import { sendWhatsAppMessages } from "@/lib/integrations/whatsapp/provider";
import { formatTarih } from "@/lib/utils/format";
import { SABLON_ETIKETLERI, mesajOlustur } from "@/lib/domain/mesajSablonlari";
import {
  buildBeyannameWhatsAppMessage,
  buildRaporWhatsAppMessage,
  buildVadeWhatsAppMessage,
} from "@/lib/domain/whatsappGonderim";
import type { MesajTuru } from "@/lib/domain/otomatikGonderim";
import { MessageCircle, Send, CheckCircle2, X, Users } from "lucide-react";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";

interface Props {
  open: boolean;
  onClose: () => void;
  raporId?: string;
  raporIds?: string[];
  musteriId?: string;
  onSuccess?: (raporIds: string[]) => void;
}

/** Manuel toplu gönderimde seçilebilecek mesaj türleri — metinleri Ayarlar > Entegrasyonlar > WhatsApp'taki merkezî şablonlardan gelir. */
const MANUEL_TURLER: MesajTuru[] = ["beyanname", "rapor", "vade"];

export function WhatsAppGonderimModal({ open, onClose, musteriId, raporId, raporIds = [], onSuccess }: Props) {
  const toast = useToast();
  const logAudit = useAuditLog();
  const { musteriler, beyannameler, tahsilatlar, raporlar, tebligatlar, gorevler, tahakkuklar, kdv2, whatsappEntegrasyonAyarlari } = useAppData();
  const riskMap = riskMapOlustur({ musteriler, tebligatlar, beyannameler, gorevler, tahsilatlar, tahakkuklar, kdv2 });
  const waAyar = whatsappEntegrasyonAyarlari[0];
  const [step, setStep] = useState<"secim" | "onay" | "gonderiliyor" | "sonuc">("secim");
  const [seciliMusteriler, setSeciliMusteriler] = useState<string[]>(musteriId ? [musteriId] : []);
  const [secilenSablon, setSecilenSablon] = useState<MesajTuru>("beyanname");
  const [gonderimSonuclari, setGonderimSonuclari] = useState<{ musteriId: string; basarili: boolean }[]>([]);
  /** true → Meta onaylı template, false → serbest metin (oturum içi) */
  const [useTemplate, setUseTemplate] = useState(false);

  const toggleMusteri = (id: string) => {
    setSeciliMusteriler((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const fillTemplate = (musteriId: string) => {
    const musteri = musteriler.find((m) => m.id === musteriId);
    const beyan = beyannameler.find((b) => b.musteriId === musteriId && b.durum !== "verildi");
    const tahsilat = tahsilatlar.find((t) => t.musteriId === musteriId && t.durum !== "odendi");
    const relatedRaporIds = raporIds.length > 0 ? raporIds : raporId ? [raporId] : [];
    const rapor = raporlar.find((r) => relatedRaporIds.includes(r.id)) ?? raporlar.find((r) => r.musteriId === musteriId);
    const musteriAdi = musteri?.firmaAdi ?? "Mükellef";

    switch (secilenSablon) {
      case "rapor":
        return buildRaporWhatsAppMessage(
          { musteriAdi, donem: rapor?.donem ?? tahsilat?.donem ?? "ilgili", raporTuru: rapor?.tip.replace("_", " ") ?? "rapor" },
          waAyar
        );
      case "vade":
        return buildVadeWhatsAppMessage(
          { musteriAdi, tutar: tahsilat?.tutar, vadeTarihi: tahsilat?.vadeTarihi ? formatTarih(tahsilat.vadeTarihi) : undefined },
          waAyar
        );
      case "beyanname":
      default:
        return buildBeyannameWhatsAppMessage(
          {
            musteriAdi,
            tur: beyan?.tur ?? "ilgili",
            donem: beyan?.donem ?? "ilgili",
            sonTarih: beyan?.sonTarih ? formatTarih(beyan.sonTarih) : "yaklaşan",
          },
          waAyar
        );
    }
  };

  const handleGonder = async () => {
    setStep("gonderiliyor");
    try {
    const mesajlar = seciliMusteriler
      .map((id) => {
        const musteri = musteriler.find((m) => m.id === id);
        if (!musteri) return null;
        const filledText = fillTemplate(musteri.id);
        const beyan = beyannameler.find((b) => b.musteriId === id && b.durum !== "verildi");
        const tahsilat = tahsilatlar.find((t) => t.musteriId === id && t.durum !== "odendi");
        return {
          musteriId: musteri.id,
          musteriAdi: musteri.firmaAdi,
          phone: musteri.telefon,
          body: filledText,
          // Şablon parametreleri: [firma_adi, beyan_turu, son_tarih] (musavir_hatirlatma şablonu için)
          templateParams: [
            musteri.firmaAdi,
            beyan?.tur ?? "ilgili beyanname",
            beyan?.sonTarih
              ? new Date(beyan.sonTarih).toLocaleDateString("tr-TR")
              : tahsilat?.vadeTarihi
              ? new Date(tahsilat.vadeTarihi).toLocaleDateString("tr-TR")
              : "yaklaşan tarih",
          ],
        };
      })
      .filter(Boolean) as {
        musteriId: string;
        musteriAdi: string;
        phone: string;
        body: string;
        templateParams: string[];
      }[];
    const providerSonuclari = await sendWhatsAppMessages(mesajlar, { useTemplate });
    const sonuclar = providerSonuclari.map((sonuc) => ({
      musteriId: sonuc.musteriId,
      basarili: sonuc.basarili,
    }));

    if (isFirebaseConfigured) {
      await Promise.all(
        providerSonuclari.map(({ musteriId: mid, basarili, hataMesaji }) => {
          const mesaj = mesajlar.find((m) => m.musteriId === mid);
          return createGonderimKaydi({
            kanal: "whatsapp",
            musteriId: mid,
            musteriAdi: mesaj?.musteriAdi ?? mid,
            sablonId: secilenSablon,
            icerikRef: raporIds[0] ?? raporId,
            mesaj: mesaj?.body,
            durum: basarili ? "gonderildi" : "basarisiz",
            hataMesaji,
            sentAt: basarili ? new Date().toISOString() : undefined,
          });
        })
      );
    }

    setGonderimSonuclari(sonuclar);
    setStep("sonuc");
    const basarili = sonuclar.filter((s) => s.basarili).length;
    await logAudit({
      action: "send",
      entityType: "gonderim",
      entityId: `whatsapp-${Date.now()}`,
      entityLabel: SABLON_ETIKETLERI[secilenSablon],
      summary: `${basarili}/${sonuclar.length} WhatsApp mesajı gönderildi`,
      after: {
        kanal: "whatsapp",
        aliciSayisi: sonuclar.length,
        basarili,
        sablonId: secilenSablon,
      },
    });
    toast.success(`${basarili}/${sonuclar.length} mesaj gönderildi`);

    const relatedRaporIds = raporIds.length > 0 ? raporIds : raporId ? [raporId] : [];
    if (basarili > 0 && relatedRaporIds.length > 0) {
      onSuccess?.(relatedRaporIds);
    }
    } catch (err) {
      console.error(err);
      setStep("secim");
      toast.error("Mesajlar gönderilemedi", parseFirestoreError(err));
    }
  };

  const handleKapat = () => {
    setStep("secim");
    setSeciliMusteriler(musteriId ? [musteriId] : []);
    onClose();
  };

  const previewMusteriId = seciliMusteriler[0];
  const previewText = previewMusteriId ? fillTemplate(previewMusteriId) : mesajOlustur(secilenSablon, waAyar, {});

  return (
    <Modal open={open} onClose={handleKapat} title="WhatsApp Toplu Gönderim" size="lg">
      {/* Adım göstergesi */}
      <div className="flex items-center gap-2 mb-6">
        {["Alıcı Seç", "Şablon & Önizleme", "Gönder"].map((label, i) => {
          const stepNum = i + 1;
          const currentStep = step === "secim" ? 1 : step === "onay" ? 2 : 3;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= stepNum ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {stepNum}
              </div>
              <span className={`text-xs ${currentStep >= stepNum ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                {label}
              </span>
              {i < 2 && <span className="text-slate-300 text-xs">—</span>}
            </div>
          );
        })}
      </div>

      {/* Adım 1: Alıcı seçimi */}
      {step === "secim" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600">Mesaj gönderilecek müşterileri seçin</p>
            <button
              onClick={() =>
                setSeciliMusteriler(
                  seciliMusteriler.length === musteriler.length
                    ? []
                    : musteriler.filter((m) => m.durum === "aktif").map((m) => m.id)
                )
              }
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              {seciliMusteriler.length === musteriler.filter((m) => m.durum === "aktif").length ? "Seçimi Kaldır" : "Tümünü Seç"}
            </button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {musteriler.filter((m) => m.durum === "aktif").map((m) => {
              const risk = riskMap.get(m.id);
              const seviye = risk?.seviye ?? "dusuk";
              return (
              <label
                key={m.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                  seciliMusteriler.includes(m.id)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={seciliMusteriler.includes(m.id)}
                  onChange={() => toggleMusteri(m.id)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.firmaAdi}</p>
                  <p className="text-xs text-slate-400">{m.telefon}</p>
                </div>
                <Badge variant={seviye === "kritik" ? "danger" : seviye === "yuksek" ? "warning" : "neutral"}>
                  {seviye}
                </Badge>
              </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {seciliMusteriler.length} alıcı seçildi
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleKapat}>İptal</Button>
              <Button
                size="sm"
                disabled={seciliMusteriler.length === 0}
                onClick={() => setStep("onay")}
              >
                Devam
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adım 2: Şablon seçimi */}
      {step === "onay" && (
        <div>
          {/* Oturum / Şablon toggle */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-700">
                {useTemplate ? "Şablon Mesajı (Template)" : "Oturum Mesajı (Serbest Metin)"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {useTemplate
                  ? "Meta onaylı şablon — 24 saat dışı gönderim için zorunlu"
                  : "Serbest metin — sadece müşteri son 24 saatte mesaj atmışsa çalışır"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUseTemplate((v) => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                useTemplate ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  useTemplate ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {MANUEL_TURLER.map((tur) => (
              <label
                key={tur}
                className={`block p-3 rounded-xl border cursor-pointer transition-colors ${
                  secilenSablon === tur ? "bg-blue-50 border-blue-300" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="sablon"
                    value={tur}
                    checked={secilenSablon === tur}
                    onChange={() => setSecilenSablon(tur)}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-semibold text-slate-800">{SABLON_ETIKETLERI[tur]}</span>
                </div>
                <p className="text-xs text-slate-500 ml-5">{mesajOlustur(tur, waAyar, {})}</p>
              </label>
            ))}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-800">Önizleme</span>
            </div>
            <p className="text-xs text-green-700">{previewText}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-500 mb-1">Özet:</p>
            <p className="text-xs text-slate-700">
              <strong>{seciliMusteriler.length}</strong> müşteriye <strong>{SABLON_ETIKETLERI[secilenSablon]}</strong> şablonu gönderilecek.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setStep("secim")}>Geri</Button>
            <Button
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={handleGonder}
            >
              Gönder ({seciliMusteriler.length})
            </Button>
          </div>
        </div>
      )}

      {/* Gönderiliyor */}
      {step === "gonderiliyor" && (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-700">Mesajlar gönderiliyor...</p>
          <p className="text-xs text-slate-400 mt-1">{seciliMusteriler.length} alıcı</p>
        </div>
      )}

      {/* Sonuç */}
      {step === "sonuc" && (
        <div>
          <div className="text-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-800">
              {gonderimSonuclari.filter((s) => s.basarili).length} / {gonderimSonuclari.length} mesaj gönderildi
            </p>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {gonderimSonuclari.map(({ musteriId: mid, basarili }) => {
              const m = musteriler.find((mu) => mu.id === mid);
              return (
                <div key={mid} className={`flex items-center justify-between p-2 rounded-lg ${basarili ? "bg-emerald-50" : "bg-red-50"}`}>
                  <span className="text-xs text-slate-700">{m?.firmaAdi}</span>
                  {basarili ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <Button onClick={handleKapat}>Kapat</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
