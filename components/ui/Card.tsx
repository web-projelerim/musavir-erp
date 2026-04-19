import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-md",
      padding === "sm" && "p-4",
      padding === "md" && "p-5",
      className
    )}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: "default" | "warning" | "danger" | "success";
  className?: string;
}

const metricBg: Record<string, string> = {
  default: "#fff",
  warning: "#fffbeb",
  danger:  "#fef2f2",
  success: "#f0fdf4",
};

const metricBorder: Record<string, string> = {
  default: "#e5e7eb",
  warning: "#fde68a",
  danger:  "#fecaca",
  success: "#bbf7d0",
};

export function MetricCard({ title, value, subtitle, icon, trend, variant = "default", className }: MetricCardProps) {
  return (
    <div className={cn("rounded-md p-4", className)}
      style={{ background: metricBg[variant], border: `1px solid ${metricBorder[variant]}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p style={{ fontSize: 10, fontWeight: 500, color: "#6b7280", textTransform: "uppercase",
            letterSpacing: "0.05em" }}>
            {title}
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginTop: 4 }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{subtitle}</p>
          )}
          {trend && (
            <p style={{ fontSize: 11, fontWeight: 500, marginTop: 3,
              color: trend.value >= 0 ? "#059669" : "#dc2626" }}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 rounded flex items-center justify-center"
            style={{ width: 32, height: 32, background: "#f3f4f6" }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
