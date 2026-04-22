"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MetricCard } from "@/components/ui/Card";

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

export function StatsDrawer({
  title,
  subtitle,
  eyebrow = "Genel Durum",
  metrics,
}: StatsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        aria-label={`${eyebrow} panelini aç`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 z-40 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-r-xl border-y border-r border-slate-200 bg-white text-slate-600 shadow-lg transition-colors hover:bg-blue-50 hover:text-blue-600 lg:left-60"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-0 top-20 z-40 w-[min(420px,calc(100vw-4rem))] lg:left-60">
      <section className="h-full overflow-y-auto rounded-r-xl border-y border-r border-slate-200 bg-slate-50/95 p-4 shadow-2xl backdrop-blur">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} className="shadow-none" />
          ))}
        </div>
      </section>
      <button
        type="button"
        aria-label={`${eyebrow} panelini kapat`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(false)}
        className="absolute -right-11 top-1/2 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-r-xl border-y border-r border-slate-200 bg-white text-slate-600 shadow-lg transition-colors hover:bg-blue-50 hover:text-blue-600"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  );
}
