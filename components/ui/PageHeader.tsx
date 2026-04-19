import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({ title, subtitle, action, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-5", className)}>
      {breadcrumb && (
        <nav className="flex items-center gap-1 mb-2" style={{ fontSize: 11, color: "#9ca3af" }}>
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span style={{ color: "#d1d5db" }}>/</span>}
              {item.href ? (
                <Link href={item.href} style={{ color: "#6b7280" }}
                  className="hover:text-gray-900 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span style={{ color: i === breadcrumb.length - 1 ? "#374151" : undefined,
                  fontWeight: i === breadcrumb.length - 1 ? 500 : undefined }}>
                  {item.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
