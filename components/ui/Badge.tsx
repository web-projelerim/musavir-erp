import { cn } from "@/lib/utils/cn";
import type { RiskSeviyesi, GorevDurum, TahsilatDurum, TebligatDurum, BeyannameDurum, RaporDurum } from "@/lib/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "purple";
  className?: string;
  dot?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  default: { background: "#f3f4f6", color: "#374151" },
  success: { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
  warning: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" },
  danger:  { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" },
  info:    { background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" },
  neutral: { background: "#f9fafb", color: "#4b5563", border: "1px solid #e5e7eb" },
  purple:  { background: "#f3e8ff", color: "#6b21a8", border: "1px solid #e9d5ff" },
};

const dotColor: Record<string, string> = {
  success: "#16a34a",
  warning: "#ca8a04",
  danger:  "#dc2626",
  info:    "#2563eb",
  neutral: "#6b7280",
  default: "#6b7280",
  purple:  "#7c3aed",
};

export function Badge({ children, variant = "default", className, dot }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium rounded", className)}
      style={{ ...styles[variant], fontSize: 10, padding: "2px 7px", lineHeight: "16px" }}>
      {dot && (
        <span className="rounded-full inline-block flex-shrink-0"
          style={{ width: 5, height: 5, background: dotColor[variant] }} />
      )}
      {children}
    </span>
  );
}

export function RiskBadge({ seviye }: { seviye: RiskSeviyesi }) {
  const map: Record<RiskSeviyesi, { label: string; variant: BadgeProps["variant"] }> = {
    dusuk:  { label: "Düşük",   variant: "success" },
    orta:   { label: "Orta",    variant: "warning" },
    yuksek: { label: "Yüksek",  variant: "danger"  },
    kritik: { label: "Kritik",  variant: "danger"  },
  };
  const { label, variant } = map[seviye];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function GorevDurumBadge({ durum }: { durum: GorevDurum }) {
  const map: Record<GorevDurum, { label: string; variant: BadgeProps["variant"] }> = {
    beklemede:  { label: "Beklemede",     variant: "neutral" },
    devam:      { label: "Devam Ediyor",  variant: "info"    },
    tamamlandi: { label: "Tamamlandı",   variant: "success" },
    iptal:      { label: "İptal",        variant: "neutral" },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function TahsilatBadge({ durum }: { durum: TahsilatDurum }) {
  const map: Record<TahsilatDurum, { label: string; variant: BadgeProps["variant"] }> = {
    odendi:  { label: "Ödendi",       variant: "success" },
    bekliyor:{ label: "Bekliyor",     variant: "neutral" },
    gecikti: { label: "Gecikti",      variant: "danger"  },
    kismi:   { label: "Kısmi Ödeme", variant: "warning" },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function TebligatBadge({ durum }: { durum: TebligatDurum }) {
  const map: Record<TebligatDurum, { label: string; variant: BadgeProps["variant"] }> = {
    yeni:    { label: "Yeni",    variant: "danger"  },
    okundu:  { label: "Okundu",  variant: "info"    },
    islendi: { label: "İşlendi",variant: "success" },
    bekliyor:{ label: "Bekliyor",variant: "warning" },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function BeyannameBadge({ durum }: { durum: BeyannameDurum }) {
  const map: Record<BeyannameDurum, { label: string; variant: BadgeProps["variant"] }> = {
    verildi: { label: "Verildi", variant: "success" },
    bekliyor:{ label: "Bekliyor",variant: "neutral" },
    gecikti: { label: "Gecikti",variant: "danger"  },
    iptal:   { label: "İptal",  variant: "neutral" },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function RaporDurumBadge({ durum }: { durum: RaporDurum }) {
  const map: Record<RaporDurum, { label: string; variant: BadgeProps["variant"] }> = {
    uretiliyor: { label: "Üretiliyor", variant: "info"    },
    hazir:      { label: "Hazır",      variant: "success" },
    gonderildi: { label: "Gönderildi",variant: "success" },
    basarisiz:  { label: "Başarısız", variant: "danger"  },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant} dot>{label}</Badge>;
}
