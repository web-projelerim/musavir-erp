import { Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface InfoBannerProps {
  children: React.ReactNode;
  variant?: "info" | "warning";
  className?: string;
}

const variantStyles = {
  info: { wrap: "bg-blue-50 border-blue-200 text-blue-700", icon: "text-blue-500" },
  warning: { wrap: "bg-amber-50 border-amber-200 text-amber-700", icon: "text-amber-500" },
};

/** Kısa bağlamsal bilgilendirme/uyarı şeridi — ikon + metin, tek satır veya kısa açıklama için. */
export function InfoBanner({ children, variant = "info", className }: InfoBannerProps) {
  const Icon = variant === "warning" ? AlertTriangle : Info;
  const styles = variantStyles[variant];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm", styles.wrap, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", styles.icon)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
