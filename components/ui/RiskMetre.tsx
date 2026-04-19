import { cn } from "@/lib/utils/cn";
import type { RiskSeviyesi } from "@/lib/types";

interface RiskMetreProps {
  skor: number;
  seviye: RiskSeviyesi;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const seviyeRenk = {
  dusuk: "bg-emerald-500",
  orta: "bg-amber-500",
  yuksek: "bg-orange-500",
  kritik: "bg-red-600",
};

const seviyeTrack = {
  dusuk: "bg-emerald-100",
  orta: "bg-amber-100",
  yuksek: "bg-orange-100",
  kritik: "bg-red-100",
};

export function RiskMetre({ skor, seviye, showLabel = false, size = "sm" }: RiskMetreProps) {
  return (
    <div className={cn("flex items-center gap-2", size === "md" && "flex-col items-start")}>
      <div className={cn("relative rounded-full overflow-hidden", seviyeTrack[seviye], size === "sm" ? "w-16 h-1.5" : "w-full h-2")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", seviyeRenk[seviye])}
          style={{ width: `${skor}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("text-xs font-semibold tabular-nums",
          seviye === "dusuk" && "text-emerald-600",
          seviye === "orta" && "text-amber-600",
          seviye === "yuksek" && "text-orange-600",
          seviye === "kritik" && "text-red-600",
        )}>
          {skor}
        </span>
      )}
    </div>
  );
}
