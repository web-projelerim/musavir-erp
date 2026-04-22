import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({ title, subtitle, action, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumb && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              {item.href ? (
                <a href={item.href} className="hover:text-blue-600 transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className={i === breadcrumb.length - 1 ? "text-slate-700 font-medium" : ""}>
                  {item.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="w-full sm:ml-6 sm:w-auto sm:flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
