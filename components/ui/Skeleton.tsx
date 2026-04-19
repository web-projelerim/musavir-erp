import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("skeleton", className)} style={style} />
  );
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "12px" }}>
          <Skeleton style={{ height: 14, width: i === 0 ? 160 : 80, borderRadius: 3 }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-md p-4" style={{ border: "1px solid #e5e7eb" }}>
      <Skeleton style={{ height: 10, width: 80, marginBottom: 10, borderRadius: 3 }} />
      <Skeleton style={{ height: 24, width: 60, marginBottom: 8, borderRadius: 3 }} />
      <Skeleton style={{ height: 10, width: 120, borderRadius: 3 }} />
    </div>
  );
}

export function SkeletonMetrics({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
