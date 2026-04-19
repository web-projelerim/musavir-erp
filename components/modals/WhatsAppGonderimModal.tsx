"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/lib/context/ToastContext";
import { MOCK_MUSTERILER } from "@/lib/data/mock";
import { MessageCircle, Send, CheckCircle2, X, Users } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  raporId?: string;
  musteriId?: string;
}

const SABLONLAR = [
  {
    id: "s1",
    ad: "Beyanname Hatırlatma",
    icerik: "Sayın {firma_adi}, {beyan_turu} beyannamenizin son tarihi {son_tarih}'dir. Lütfen gerekli belgeleri hazırlayın.",
  },
  {
    id: "s2",
    ad: "Rapor Gönderimi",
    icerik: "Sayın {firma_adi}, {donem} dönemi {rapor_turu} raporunuz hazırlanmıştır. Raporunuza portal üzerinden erişebilirsiniz.",
  },
  {
    id: "s3",
    ad: "Tahsilat Hatırlatma",
    icerik: "Sayın {firma_adi}, {donem} dönemi müşavirlik ücretinizin vade tarihi {vade_tarihi}'dir.",
  },
];

export function WhatsAppGonderimModal({ open, onClose, musteriId }: Props) {
  const toast = useToast();
  const [step, setStep] = useState<"secim" | "onay" | "gonderiliyor" | "sonuc">("secim");
  const [seciliMusteriler, setSeciliMusteriler] = useState<string[]>(musteriId ? [musteriId] : []);
  const [secilenSablon, setSecilenSablon] = useState(SABLONLAR[0].id);
  const [gonderimSonuclari, setGonderimSonuclari] = useState<{ musteriId: string; basarili: boolean }[]>([]);

  const toggleMusteri = (id: string) => {
    setSeciliMusteriler((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleGonder = async () => {
    setStep("gonderiliyor");
    await new Promise((r) => setTimeout(r, 1500));
    const sonuclar = seciliMusteriler.map((id) => ({
      musteriId: id,
      basarili: Math.random() > 0.1,
    }));
    setGonderimSonuclari(sonuclar);
    setStep("sonuc");
    const basarili = sonuclar.filter((s) => s.basarili).length;
    toast.success(`${basarili}/${sonuclar.length} mesaj gönderildi`);
  };

  const handleKapat = () => {
    setStep("secim");
    setSeciliMusteriler(musteriId ? [musteriId] : []);
    onClose();
  };

  const sablon = SABLONLAR.find((s) => s.id === secilenSablon)!;

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
                  seciliMusteriler.length === MOCK_MUSTERILER.length
                    ? []
                    : MOCK_MUSTERILER.filter((m) => m.durum === "aktif").map((m) => m.id)
                )
              }
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              {seciliMusteriler.length === MOCK_MUSTERILER.filter((m) => m.durum === "aktif").length ? "Seçimi Kaldır" : "Tümünü Seç"}
            </button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {MOCK_MUSTERILER.filter((m) => m.durum === "aktif").map((m) => (
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
                <Badge variant={m.riskSeviyesi === "kritik" ? "danger" : m.riskSeviyesi === "yuksek" ? "warning" : "neutral"}>
                  {m.riskSeviyesi}
                </Badge>
              </label>
            ))}
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
          <div className="space-y-2 mb-4">
            {SABLONLAR.map((s) => (
              <label
                key={s.id}
                className={`block p-3 rounded-xl border cursor-pointer transition-colors ${
                  secilenSablon === s.id ? "bg-blue-50 border-blue-300" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="sablon"
                    value={s.id}
                    checked={secilenSablon === s.id}
                    onChange={() => setSecilenSablon(s.id)}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-semibold text-slate-800">{s.ad}</span>
                </div>
                <p className="text-xs text-slate-500 ml-5">{s.icerik}</p>
              </label>
            ))}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-800">Önizleme</span>
            </div>
            <p className="text-xs text-green-700">{sablon.icerik}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-500 mb-1">Özet:</p>
            <p className="text-xs text-slate-700">
              <strong>{seciliMusteriler.length}</strong> müşteriye <strong>{sablon.ad}</strong> şablonu gönderilecek.
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
              const m = MOCK_MUSTERILER.find((mu) => mu.id === mid);
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
