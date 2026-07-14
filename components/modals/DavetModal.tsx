"use client";

import { useEffect, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { authHeaders, isFirebaseConfigured } from "@/lib/firebase/client";
import { createDavet } from "@/lib/firebase/repositories";
import { buildInviteLink, createInviteToken, hashInviteToken, inviteExpiry } from "@/lib/domain/davet";
import { getOfisId } from "@/lib/domain/office";
import { useAppData } from "@/lib/hooks/useAppData";
import { whatsappGonderimYurut, buildDavetWhatsAppMessage } from "@/lib/domain/whatsappGonderim";
import type { UserRole } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  musteriId?: string;
  musteriAdi?: string;
  defaultEmail?: string;
}

export function DavetModal({ open, onClose, defaultRole = "musavir", musteriId, musteriAdi, defaultEmail = "" }: Props) {
  const { user } = useAuth();
  const { musteriler, whatsappEntegrasyonAyarlari } = useAppData();
  const toast = useToast();
  const logAudit = useAuditLog();
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const [emailGonder, setEmailGonder] = useState(true);
  const [emailGonderiliyor, setEmailGonderiliyor] = useState(false);
  const fixedMukellef = Boolean(musteriId);
  // Personel rolü kaldırıldı: mükellef daveti dışındaki davetler her zaman müşavir rolündedir.
  const role: UserRole = fixedMukellef ? "mukellef" : defaultRole;

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setCreatedLink("");
    }
  }, [defaultEmail, open]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      toast.error("E-posta zorunludur");
      return;
    }

    const token = createInviteToken();
    const link = buildInviteLink(token);
    setLoading(true);

    try {
      if (isFirebaseConfigured) {
        await createDavet({
          ofisId: getOfisId(user?.ofisId),
          rol: role,
          email,
          musteriId,
          musteriAdi,
          yetkiler: [],
          tokenHash: await hashInviteToken(token),
          davetLinki: link,
          expiresAt: inviteExpiry(7),
          createdBy: user?.id ?? "system",
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      await logAudit({
        action: "invite",
        entityType: "davet",
        entityId: token,
        entityLabel: email,
        summary: `${fixedMukellef ? "Mükellef" : role} daveti oluşturuldu`,
        after: { email, role: fixedMukellef ? "mukellef" : role, musteriId },
      });
      setCreatedLink(link);
      toast.success("Davet oluşturuldu");

      // WhatsApp davet mesajı — yalnızca mükellef daveti + telefon varsa.
      // Otomatik / onay-bekle kararı ayarlardan gelir (davetMesajiOtomatikGonder).
      if (fixedMukellef && musteriId) {
        const musteri = musteriler.find((m) => m.id === musteriId);
        const telefon = musteri?.gsm1 || musteri?.telefon;
        if (telefon) {
          try {
            const sonuc = await whatsappGonderimYurut({
              ayar: whatsappEntegrasyonAyarlari[0],
              tur: "davet",
              ofisId: user?.ofisId,
              musteriId,
              musteriAdi: musteriAdi ?? musteri?.firmaAdi ?? "",
              telefon,
              mesaj: buildDavetWhatsAppMessage({ musteriAdi: musteriAdi ?? musteri?.firmaAdi ?? "", davetLinki: link }, whatsappEntegrasyonAyarlari[0]),
              sablonId: "davet",
              icerikRef: token,
              firebaseAcik: isFirebaseConfigured,
            });
            if (sonuc.karar === "otomatik" && sonuc.gonderildi) toast.success("Davet WhatsApp ile gönderildi");
            else if (sonuc.karar === "onay_bekle") toast.info("Davet mesajı onay kuyruğuna eklendi");
          } catch {
            // WhatsApp hatası davet oluşturmayı engellemez
          }
        }
      }

      // P3-3: E-posta gönderimi (SMTP env varsa)
      if (emailGonder) {
        setEmailGonderiliyor(true);
        try {
          const emailRes = await fetch("/api/email/send", {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({
              to: email,
              subject: "MusavirERP Davet Linkiniz",
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                  <h2 style="color:#1e40af;">MusavirERP'ye Davetlisiniz</h2>
                  ${musteriAdi ? `<p>Mali müşaviriniz sizi <strong>${musteriAdi}</strong> hesabına bağlamak üzere davet etti.</p>` : "<p>Mali müşaviriniz sizi sisteme davet etti.</p>"}
                  <p>Aşağıdaki linke tıklayarak hesabınızı oluşturun:</p>
                  <a href="${link}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Hesabı Aktifleştir</a>
                  <p style="color:#64748b;font-size:12px;margin-top:16px;">Bu link 7 gün geçerlidir. Beklemiyor iseniz bu e-postayı görmezden gelebilirsiniz.</p>
                </div>
              `,
            }),
          });
          if (emailRes.status === 501) {
            toast.info("E-posta gönderilemedi", "SMTP env değişkenleri tanımlı değil — link manuel paylaşın");
          } else if (emailRes.ok) {
            toast.success("Davet e-postası gönderildi", email);
          }
        } catch {
          // E-posta hatası davet oluşturmayı engellemez
        } finally {
          setEmailGonderiliyor(false);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Davet oluşturulamadı", parseFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    toast.success("Davet linki kopyalandı");
  };

  const modalBaslik = fixedMukellef ? "Mükellef Daveti" : "Mali Müşavir Daveti";

  return (
    <Modal open={open} onClose={onClose} title={modalBaslik} size="md">
      <form onSubmit={handleCreate} className="space-y-4">
        <Input
          label="E-posta"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ad@firma.com"
          required
        />
        {musteriAdi && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
            Davet bu mükellef hesabına bağlanacak: <strong>{musteriAdi}</strong>
          </div>
        )}
        {/* P3-3: E-posta gönderimi toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-700">Davet e-postası gönder</p>
            <p className="text-xs text-slate-500 mt-0.5">SMTP tanımlıysa mükellefe link e-posta ile gider</p>
          </div>
          <button
            type="button"
            onClick={() => setEmailGonder((v) => !v)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              emailGonder ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                emailGonder ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {createdLink && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <Link2 className="h-3.5 w-3.5" />
              Davet linki hazır
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={createdLink}
                className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700"
              />
              <Button type="button" size="sm" variant="outline" icon={<Copy className="h-3.5 w-3.5" />} onClick={copyLink}>
                Kopyala
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Kapat</Button>
          <Button type="submit" loading={loading}>Davet Oluştur</Button>
        </div>
      </form>
    </Modal>
  );
}
