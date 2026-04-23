import { cn } from "@/lib/utils/cn";

interface MobileListProps {
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function MobileList({
  children,
  empty,
  emptyMessage = "Kayıt bulunamadı",
  className,
}: MobileListProps) {
  if (empty) {
    return (
      <div className={cn("md:hidden px-4 py-6 text-center text-sm text-slate-400", className)}>
        {emptyMessage}
      </div>
    );
  }

  return <div className={cn("md:hidden divide-y divide-slate-100", className)}>{children}</div>;
}

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCard({ children, className, onClick }: MobileCardProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "block w-full px-4 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100",
          className
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={cn("block w-full px-4 py-4 text-left transition-colors", className)}>
      {children}
    </div>
  );
}

export function MobileField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-xs text-slate-700">{children}</div>
    </div>
  );
}
