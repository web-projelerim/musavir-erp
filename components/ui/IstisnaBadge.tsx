import { AlertTriangle } from "lucide-react";
import { ISTISNA_ETIKETLERI, type MusteriIstisna } from "@/lib/types";

interface Props {
  istisnalar?: MusteriIstisna[];
  not?: string;
  className?: string;
}

/**
 * Vergisel istisna/teşviği olan mükellefler için sarı uyarı rozeti (§1.4).
 * Beyanname / geçici vergi ekranlarında mükellef adının yanında gösterilir.
 */
export function IstisnaBadge({ istisnalar, not, className }: Props) {
  if (!istisnalar || istisnalar.length === 0) return null;
  const etiketler = istisnalar.map(
    (i) => ISTISNA_ETIKETLERI.find((e) => e.value === i)?.label ?? i
  );
  const title = `Vergisel istisna: ${etiketler.join(", ")}${not ? ` — ${not}` : ""}. Beyanname hazırlarken dikkat!`;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ${className ?? ""}`}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      İstisna
    </span>
  );
}
