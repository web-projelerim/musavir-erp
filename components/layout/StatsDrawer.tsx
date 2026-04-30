"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type MetricVariant = "default" | "warning" | "danger" | "success";

interface StatsDrawerMetric {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  variant?: MetricVariant;
}

interface StatsDrawerProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  metrics: StatsDrawerMetric[];
}

const VARIANT_CARD: Record<MetricVariant, string> = {
  default: "border-slate-200 bg-white",
  warning: "border-amber-200 bg-amber-50",
  danger:  "border-red-200 bg-red-50",
  success: "border-emerald-200 bg-emerald-50",
};

const VARIANT_ICON: Record<MetricVariant, string> = {
  default: "bg-blue-50 text-blue-600",
  warning: "bg-amber-100 text-amber-700",
  danger:  "bg-red-100 text-red-700",
  success: "bg-emerald-100 text-emerald-700",
};

export function StatsDrawer({
  title,
  subtitle,
  eyebrow = "Genel Durum",
  metrics,
}: StatsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Kapalı — sağ üstte sekme */}
      {!isOpen && (
        <button
          type="button"
          aria-label="İstatistikleri aç"
          aria-expanded={false}
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-32 z-40 flex items-center justify-center rounded-l-xl border-y border-l border-slate-200 bg-white px-2 py-3 text-slate-500 shadow-md transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        </button>
      )}

      {/* Açık — yatay panel, sağ üstten açılır */}
      {isOpen && (
        <div className="fixed left-0 right-0 top-20 z-40 border-b border-slate-200 bg-white/95 shadow-xl backdrop-blur lg:left-60">
          <div className="px-5 py-4">
            {/* Panel başlığı */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {eyebrow}
                </p>
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="İstatistikleri kapat"
                aria-expanded={true}
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>

            {/* Yatay metrik kartlar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map((metric) => {
                const variant = metric.variant ?? "default";
                return (
                  <div
                    key={metric.title}
                    className={cn("rounded-xl border p-3.5", VARIANT_CARD[variant])}
                  >
                    <div className="flex items-start gap-2.5">
                      {metric.icon && (
                        <span
                          className={cn(
                            "mt-0.5 flex-shrink-0 rounded-lg p-1.5",
                            VARIANT_ICON[variant]
                          )}
                        >
                          {metric.icon}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {metric.title}
                        </p>
                        <p className="mt-0.5 text-xl font-bold text-slate-900">{metric.value}</p>
                        {metric.subtitle && (
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {metric.subtitle}
                          </p>
                        )}
                        {metric.trend && (
                          <p
                            className={cn(
                              "mt-0.5 text-[10px] font-medium",
                              metric.trend.value >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {metric.trend.value >= 0 ? "↑" : "↓"}{" "}
                            {Math.abs(metric.trend.value)}% {metric.trend.label}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
