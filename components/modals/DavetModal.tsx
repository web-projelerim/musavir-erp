"use client";

import { useEffect, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createDavet } from "@/lib/firebase/repositories";
import { buildInviteLink, createInviteToken, hashInviteToken, inviteExpiry } from "@/lib/domain/davet";
import { getOfisId } from "@/lib/domain/office";
import type { UserRole } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  musteriId?: string;
  musteriAdi?: string;
  defaultEmail?: string;
}

export function DavetModal({ open, onClose, defaultRole = "personel", musteriId, musteriAdi, defaultEmail = "" }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const fixedMukellef = Boolean(musteriId);

  useEffect(() => {
    if (open) {
      setRole(defaultRole);
      setEmail(defaultEmail);
      setCreatedLink("");
    }
  }, [defaultEmail, defaultRole, open]);

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
          rol: fixedMukellef ? "mukellef" : role,
          email,
          musteriId,
          musteriAdi,
          tokenHash: hashInviteToken(token),
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
        summary: `${fixedMukellef ? "Mukellef" : role} daveti olusturuldu`,
        after: { email, role: fixedMukellef ? "mukellef" : role, musteriId },
      });
      setCreatedLink(link);
      toast.success("Davet olusturuldu");
    } catch (error) {
      console.error(error);
      toast.error("Davet olusturulamadi");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    toast.success("Davet linki kopyalandi");
  };

  return (
    <Modal open={open} onClose={onClose} title={fixedMukellef ? "Mukellef Daveti" : "Personel Daveti"} size="md">
      <form onSubmit={handleCreate} className="space-y-4">
        <Input
          label="E-posta"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ad@firma.com"
          required
        />
        {!fixedMukellef && (
          <Select
            label="Rol"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            options={[
              { value: "personel", label: "Personel" },
              { value: "musavir", label: "Mali Musavir" },
            ]}
          />
        )}
        {musteriAdi && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
            Davet bu musteri hesabina baglanacak: <strong>{musteriAdi}</strong>
          </div>
        )}
        {createdLink && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <Link2 className="h-3.5 w-3.5" />
              Davet linki hazir
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
          <Button type="submit" loading={loading}>Davet Olustur</Button>
        </div>
      </form>
    </Modal>
  );
}
