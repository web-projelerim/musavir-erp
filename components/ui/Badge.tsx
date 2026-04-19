import { cn } from "@/lib/utils/cn";
import type { RiskSeviyesi, GorevDurum, TahsilatDurum, TebligatDurum, BeyannameDurum, RaporDurum } from "@/lib/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

const variantStyles = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-slate-50 text-slate-600 border border-slate-200",
};

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ seviye }: { seviye: RiskSeviyesi }) {
  const map = {
    dusuk: { label: "Düşük Risk", variant: "success" as const },
    orta: { label: "Orta Risk", variant: "warning" as const },
    yuksek: { label: "Yüksek Risk", variant: "danger" as const },
    kritik: { label: "Kritik", variant: "danger" as const },
  };
  const { label, variant } = map[seviye];
  return (
    <Badge variant={variant}>
      {seviye === "kritik" && <span className="mr-1">⚠</span>}
      {label}
    </Badge>
  );
}

export function GorevDurumBadge({ durum }: { durum: GorevDurum }) {
  const map = {
    beklemede: { label: "Beklemede", variant: "neutral" as const },
    devam: { label: "Devam Ediyor", variant: "info" as const },
    tamamlandi: { label: "Tamamlandı", variant: "success" as const },
    iptal: { label: "İptal", variant: "neutral" as const },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant}>{label}</Badge>;
}

export function TahsilatBadge({ durum }: { durum: TahsilatDurum }) {
  const map = {
    odendi: { label: "Ödendi", variant: "success" as const },
    bekliyor: { label: "Bekliyor", variant: "neutral" as const },
    gecikti: { label: "Gecikti", variant: "danger" as const },
    kismi: { label: "Kısmi Ödeme", variant: "warning" as const },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant}>{label}</Badge>;
}

export function TebligatBadge({ durum }: { durum: TebligatDurum }) {
  const map = {
    yeni: { label: "Yeni", variant: "danger" as const },
    okundu: { label: "Okundu", variant: "info" as const },
    islendi: { label: "İşlendi", variant: "success" as const },
    bekliyor: { label: "Bekliyor", variant: "warning" as const },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant}>{label}</Badge>;
}

export function BeyannameBadge({ durum }: { durum: BeyannameDurum }) {
  const map = {
    verildi: { label: "Verildi", variant: "success" as const },
    bekliyor: { label: "Bekliyor", variant: "neutral" as const },
    gecikti: { label: "Gecikti", variant: "danger" as const },
    iptal: { label: "İptal", variant: "neutral" as const },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant}>{label}</Badge>;
}

export function RaporDurumBadge({ durum }: { durum: RaporDurum }) {
  const map = {
    uretiliyor: { label: "Üretiliyor", variant: "info" as const },
    hazir: { label: "Hazır", variant: "success" as const },
    gonderildi: { label: "Gönderildi", variant: "success" as const },
    basarisiz: { label: "Başarısız", variant: "danger" as const },
  };
  const { label, variant } = map[durum];
  return <Badge variant={variant}>{label}</Badge>;
}
