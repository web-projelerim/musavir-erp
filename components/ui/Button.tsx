import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  primary:   "bg-blue-600 text-white hover:bg-blue-700 border border-transparent shadow-xs",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent",
  ghost:     "text-gray-600 hover:bg-gray-100 border border-transparent",
  danger:    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-xs",
  outline:   "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200",
};

const sizeStyles = {
  xs: "h-6 px-2 text-[10px] gap-1 rounded",
  sm: "h-7 px-2.5 text-[11px] gap-1.5 rounded",
  md: "h-8 px-3 text-[12px] gap-2 rounded",
  lg: "h-9 px-4 text-[13px] gap-2 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
