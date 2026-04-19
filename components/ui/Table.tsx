import { cn } from "@/lib/utils/cn";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="data-table">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableHeadCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2 text-left whitespace-nowrap", className)}
      style={{ fontSize: 11, fontWeight: 500, color: "#6b7280",
        textTransform: "uppercase", letterSpacing: "0.04em",
        borderBottom: "1px solid #e5e7eb", padding: "8px 12px" }}>
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children, onClick, className, selected,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}) {
  return (
    <tr onClick={onClick}
      className={cn(className)}
      style={{
        cursor: onClick ? "pointer" : undefined,
        background: selected ? "#eff6ff" : undefined,
      }}
      onMouseEnter={onClick ? (e) => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; } : undefined}
      onMouseLeave={onClick ? (e) => { (e.currentTarget as HTMLElement).style.background = selected ? "#eff6ff" : ""; } : undefined}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children, className, colSpan, style,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  style?: React.CSSProperties;
}) {
  return (
    <td colSpan={colSpan}
      className={cn("whitespace-nowrap", className)}
      style={{ padding: "9px 12px", borderBottom: "1px solid #f3f4f6",
        fontSize: 12, color: "#374151", verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, message = "Kayıt bulunamadı" }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "40px 12px", textAlign: "center",
        fontSize: 12, color: "#9ca3af" }}>
        {message}
      </td>
    </tr>
  );
}
