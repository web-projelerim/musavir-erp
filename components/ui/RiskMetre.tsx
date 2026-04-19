import type { RiskSeviyesi } from "@/lib/types";

interface RiskMetreProps {
  skor: number;
  seviye: RiskSeviyesi;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const barColor: Record<RiskSeviyesi, string> = {
  dusuk:  "#22c55e",
  orta:   "#f59e0b",
  yuksek: "#f97316",
  kritik: "#ef4444",
};

const trackColor: Record<RiskSeviyesi, string> = {
  dusuk:  "#dcfce7",
  orta:   "#fef9c3",
  yuksek: "#ffedd5",
  kritik: "#fee2e2",
};

const labelColor: Record<RiskSeviyesi, string> = {
  dusuk:  "#16a34a",
  orta:   "#ca8a04",
  yuksek: "#ea580c",
  kritik: "#dc2626",
};

export function RiskMetre({ skor, seviye, showLabel = false, size = "sm" }: RiskMetreProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative overflow-hidden rounded-full"
        style={{
          width: size === "sm" ? 56 : 80,
          height: 5,
          background: trackColor[seviye],
        }}>
        <div className="h-full rounded-full"
          style={{ width: `${skor}%`, background: barColor[seviye], transition: "width 400ms ease" }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, fontWeight: 600, color: labelColor[seviye], fontVariantNumeric: "tabular-nums" }}>
          {skor}
        </span>
      )}
    </div>
  );
}
