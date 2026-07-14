"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createGonderimKaydi, createTahakkuk } from "@/lib/firebase/repositories";
import { buildTahakkukPanelLink, buildTahakkukWhatsAppMessage, hesaplaTurmobTutarlari } from "@/lib/domain/tahakkuk";
import { getOfisId } from "@/lib/domain/office";
import { otomatikGonderimKarari } from "@/lib/domain/otomatikGonderim";
import { sendWhatsAppMessages } from "@/lib/integrations/whatsapp/provider";
import type { HizmetTuru, Tahakkuk, TahakkukKaynakSistem, TahakkukTuru, VergiTahakkukTuru } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId?: string;
  /** Varsayılan ve tek izin verilen tür. Belirtilmezse her iki tür seçilebilir. */
  defaultTahakkukTuru?: TahakkukTuru;
  onSaved?: (tahakkuk: Tahakkuk) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function TahakkukModal({ open, onClose, musteriId, defaultTahakkukTuru, onSaved }: Props) {
  const { musteriler, whatsappEntegrasyonAyarlari } = useAppData();
  const whatsappAyar = whatsappEntegrasyonAyarlari[0];
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();
  const defaultMusteri = musteriler.find((m) => m.id === musteriId) ?? musteriler[0];
  const defaultDonem = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const initialTur = defaultTahakkukTuru ?? "hizmet";
  const [form, setForm] = useState({
    musteriId: defaultMusteri?.id ?? "",
    donem: defaultDonem,
    tahakkukTuru: initialTur as TahakkukTuru,
    hizmetTuru: "mali_musavirlik" as HizmetTuru,
    hizmetTuruDiger: "",
    vergiTuru: "KDV" as VergiTahakkukTuru,
    resmiTahakkukFisNo: "",
    kaynakSistem: "manual" as TahakkukKaynakSistem,
    tutar: String(defaultMusteri?.varsayilanHizmetUcreti ?? ""),
    kdvOrani: "20",
    stopajUygula: true,
    stopajOrani: "20",
    vadeTarihi: today(),
    aciklama: "",
    whatsappPlanla: true,
  });
  const [loading, setLoading] = useState(false);

  const selectedMusteri = musteriler.find((m) => m.id === form.musteriId);

  // Türmob hesabı: Brüt KDV dahil → Net (matrah), KDV, Stopaj, Tahsil edilecek
  // Sadece "hizmet" (mali müşavirlik ücreti vb.) tahakkuklarında anlamlı — "vergi"
  // tahakkukları (KDV/Muhtasar/... borcu) zaten net vergi tutarıdır, stopaj/KDV ayrıştırması yapılmaz.
  const hesap = useMemo(() => {
    if (form.tahakkukTuru !== "hizmet") return null;
    return hesaplaTurmobTutarlari({
      brut: Number(form.tutar) || 0,
      kdvOrani: Number(form.kdvOrani) || 0,
      stopajUygula: form.stopajUygula,
      stopajOrani: Number(form.stopajOrani) || 0,
    });
  }, [form.tahakkukTuru, form.tutar, form.kdvOrani, form.stopajUygula, form.stopajOrani]);

  const f = (field: keyof typeof form) => ({
    value: form[field] as string,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value })),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const tutar = Number(form.tutar);
    if (!selectedMusteri || !Number.isFinite(tutar) || tutar <= 0) {
      toast.error("Mükellef ve geçerli tutar zorunludur");
      return;
    }

    const panelLinki = buildTahakkukPanelLink(selectedMusteri.id);
    setLoading(true);
    try {
      let saved: Tahakkuk;
      // "diğer" seçildiyse açıklamaya hizmet türü serbest metnini ekle
      const aciklamaFinal = form.tahakkukTuru === "hizmet" && form.hizmetTuru === "diger" && form.hizmetTuruDiger
        ? `${form.hizmetTuruDiger}${form.aciklama ? " — " + form.aciklama : ""}`
        : form.aciklama || undefined;

      const payload = {
        ofisId: getOfisId(user?.ofisId),
        musteriId: selectedMusteri.id,
        musteriAdi: selectedMusteri.firmaAdi,
        donem: form.donem,
        tahakkukTuru: form.tahakkukTuru,
        hizmetTuru: form.tahakkukTuru === "hizmet" ? form.hizmetTuru : undefined,
        vergiTuru: form.tahakkukTuru === "vergi" ? form.vergiTuru : undefined,
        resmiTahakkukFisNo: form.tahakkukTuru === "vergi" ? form.resmiTahakkukFisNo || undefined : undefined,
        kaynakSistem: form.tahakkukTuru === "vergi" ? form.kaynakSistem : undefined,
        tutar,
        odenenTutar: 0,
        netTutar: hesap?.net,
        kdvTutar: hesap?.kdv,
        kdvOrani: hesap?.kdvOran,
        stopajTutar: hesap?.stopaj,
        stopajOrani: hesap?.stopajOran,
        tahsilEdilecek: hesap?.tahsil,
        vadeTarihi: form.vadeTarihi,
        durum: "bekliyor" as const,
        bildirimDurumu: form.whatsappPlanla ? ("planlandi" as const) : ("kapali" as const),
        panelLinki,
        aciklama: aciklamaFinal,
        createdBy: user?.id ?? "system",
      };

      if (isFirebaseConfigured) {
        saved = await createTahakkuk(payload);
        if (form.whatsappPlanla) {
          const karar = otomatikGonderimKarari(whatsappAyar, "tahakkuk");
          const mesaj = buildTahakkukWhatsAppMessage({
            firmaAdi: selectedMusteri.firmaAdi,
            donem: form.donem,
            tutar,
            panelLinki,
          }, whatsappAyar);

          if (karar === "pasif") {
            // Ayarlardan pasif edilmiş — gönderim oluşturma
            toast.info("Bildirim pasif", "Tahakkuk bildirimi ayarlardan kapalı; mesaj oluşturulmadı");
          } else if (karar === "otomatik") {
            // Direkt gönder
            const sonuclar = await sendWhatsAppMessages([
              { musteriId: selectedMusteri.id, musteriAdi: selectedMusteri.firmaAdi, phone: selectedMusteri.gsm1 || selectedMusteri.telefon || "", body: mesaj },
            ]).catch(() => [] as Array<{ basarili: boolean; hataMesaji?: string }>);
            const basarili = sonuclar[0]?.basarili === true;
            await createGonderimKaydi({
              ofisId: getOfisId(user?.ofisId),
              kanal: "whatsapp",
              musteriId: selectedMusteri.id,
              musteriAdi: selectedMusteri.firmaAdi,
              sablonId: "tahakkuk",
              icerikRef: saved.id,
              mesaj,
              durum: basarili ? "gonderildi" : "basarisiz",
              hataMesaji: basarili ? undefined : sonuclar[0]?.hataMesaji,
            });
            if (basarili) toast.success("WhatsApp gönderildi otomatik olarak");
            else toast.warning("WhatsApp gönderilemedi", sonuclar[0]?.hataMesaji);
          } else {
            // Onay bekle — kuyrukta kalır
            await createGonderimKaydi({
              ofisId: getOfisId(user?.ofisId),
              kanal: "whatsapp",
              musteriId: selectedMusteri.id,
              musteriAdi: selectedMusteri.firmaAdi,
              sablonId: "tahakkuk",
              icerikRef: saved.id,
              mesaj,
              durum: "bekliyor",
            });
          }
        }
      } else {
        saved = { id: `tk-${Date.now()}`, ...payload, createdAt: new Date().toISOString() };
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      onSaved?.(saved);
      await logAudit({
        action: "create",
        entityType: "tahakkuk",
        entityId: saved.id,
        entityLabel: `${saved.musteriAdi} - ${saved.donem}`,
        summary: "Tahakkuk oluşturuldu",
        after: saved as unknown as Record<string, unknown>,
      });
      toast.success("Tahakkuk oluşturuldu");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Tahakkuk kaydedilemedi", parseFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Yeni Tahakkuk" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Mükellef"
          disabled={Boolean(musteriId)}
          value={form.musteriId}
          onChange={(event) => setForm((prev) => ({ ...prev, musteriId: event.target.value }))}
          options={musteriler.map((m) => ({ value: m.id, label: m.firmaAdi }))}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Dönem" {...f("donem")} required />
          <Input label="Vade Tarihi" type="date" {...f("vadeTarihi")} required />
        </div>
        {/* Tahakkuk tipi sadece dışarıdan zorlanmamışsa görünür (mükellef içinden açılınca gizli) */}
        {!defaultTahakkukTuru && (
          <Select
            label="Tahakkuk Tipi"
            value={form.tahakkukTuru}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                tahakkukTuru: event.target.value as TahakkukTuru,
                tutar:
                  event.target.value === "hizmet"
                    ? String(selectedMusteri?.varsayilanHizmetUcreti ?? prev.tutar)
                    : prev.tutar,
              }))
            }
            options={[
              { value: "hizmet", label: "Ofis Hizmet Tahakkuku" },
              { value: "vergi", label: "Resmi Vergi Tahakkuku" },
            ]}
          />
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {form.tahakkukTuru === "hizmet" ? (
            <Select
              label="Hizmet Türü"
              value={form.hizmetTuru}
              onChange={(event) => setForm((prev) => ({ ...prev, hizmetTuru: event.target.value as HizmetTuru }))}
              options={[
                { value: "mali_musavirlik", label: "Mali Müşavirlik" },
                { value: "beyanname", label: "Beyanname" },
                { value: "danismanlik", label: "Danışmanlık" },
                { value: "diger", label: "Diğer" },
              ]}
            />
          ) : (
            <Select
              label="Vergi Türü"
              value={form.vergiTuru}
              onChange={(event) => setForm((prev) => ({ ...prev, vergiTuru: event.target.value as VergiTahakkukTuru }))}
              options={[
                { value: "KDV", label: "KDV" },
                { value: "MUHTASAR", label: "Muhtasar" },
                { value: "GECICI_VERGI", label: "Geçici Vergi" },
                { value: "KURUMLAR", label: "Kurumlar Vergisi" },
                { value: "GELIR", label: "Gelir Vergisi" },
                { value: "DAMGA", label: "Damga Vergisi" },
                { value: "SGK", label: "SGK" },
                { value: "DIGER", label: "Diğer" },
              ]}
            />
          )}
          <Input
            label={form.tahakkukTuru === "hizmet" ? "Brüt Tutar (KDV dahil)" : "Tutar"}
            type="number"
            min="0"
            step="0.01"
            {...f("tutar")}
            required
          />
        </div>

        {/* "Diğer" hizmet türü için serbest metin */}
        {form.tahakkukTuru === "hizmet" && form.hizmetTuru === "diger" && (
          <Input
            label="Hizmet Adı (Diğer)"
            placeholder="Örn: Bordro hazırlama, KDV iadesi, fizibilite raporu..."
            value={form.hizmetTuruDiger}
            onChange={(e) => setForm((prev) => ({ ...prev, hizmetTuruDiger: e.target.value }))}
          />
        )}

        {/* KDV oranı + stopaj seçimi — sadece hizmet tahakkukunda anlamlı (Türmob hesabı) */}
        {form.tahakkukTuru === "hizmet" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="KDV Oranı"
              value={form.kdvOrani}
              onChange={(e) => setForm((p) => ({ ...p, kdvOrani: e.target.value }))}
              options={[
                { value: "0", label: "%0 (İstisna)" },
                { value: "1", label: "%1" },
                { value: "10", label: "%10" },
                { value: "20", label: "%20" },
              ]}
            />
            <Select
              label="Stopaj"
              value={form.stopajUygula ? "uygula" : "uygulama"}
              onChange={(e) => setForm((p) => ({ ...p, stopajUygula: e.target.value === "uygula" }))}
              options={[
                { value: "uygula", label: "Uygulanacak" },
                { value: "uygulama", label: "Uygulanmayacak" },
              ]}
            />
            <Select
              label="Stopaj Oranı"
              value={form.stopajOrani}
              disabled={!form.stopajUygula}
              onChange={(e) => setForm((p) => ({ ...p, stopajOrani: e.target.value }))}
              options={[
                { value: "10", label: "%10" },
                { value: "20", label: "%20 (SMMM)" },
              ]}
            />
          </div>
        )}

        {/* Türmob hesap kartı */}
        {hesap && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-800 mb-2">Türmob Hesabı (KDV dahil tutardan)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Net (Matrah)</p>
                <p className="font-bold text-slate-900">{hesap.net.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</p>
              </div>
              <div>
                <p className="text-slate-500">KDV (%{hesap.kdvOran})</p>
                <p className="font-bold text-slate-900">{hesap.kdv.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</p>
              </div>
              <div>
                <p className="text-slate-500">Stopaj (%{hesap.stopajOran})</p>
                <p className="font-bold text-red-600">- {hesap.stopaj.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</p>
              </div>
              <div>
                <p className="text-slate-500">Tahsil Edilecek</p>
                <p className="font-bold text-emerald-700">{hesap.tahsil.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</p>
              </div>
            </div>
          </div>
        )}
        {form.tahakkukTuru === "vergi" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Resmi Tahakkuk Fiş No" {...f("resmiTahakkukFisNo")} />
            <Select
              label="Kaynak Sistem"
              value={form.kaynakSistem}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, kaynakSistem: event.target.value as TahakkukKaynakSistem }))
              }
              options={[
                { value: "manual", label: "Manuel" },
                { value: "gib", label: "GİB" },
                { value: "luca", label: "Luca" },
              ]}
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Açıklama</label>
          <textarea
            value={form.aciklama}
            onChange={(event) => setForm((prev) => ({ ...prev, aciklama: event.target.value }))}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.whatsappPlanla}
            onChange={(event) => setForm((prev) => ({ ...prev, whatsappPlanla: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          WhatsApp tahakkuk bildirimi planla
        </label>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
          <Button type="submit" loading={loading}>Tahakkuk Oluştur</Button>
        </div>
      </form>
    </Modal>
  );
}
