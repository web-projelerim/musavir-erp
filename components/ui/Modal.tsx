"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
  className?: string;
}

const maxWidths = { sm: 400, md: 520, lg: 680, xl: 880 };

export function Modal({ open, onClose, title, subtitle, children, size = "md", footer, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!open) return null;

  return (
    <div ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgb(0 0 0 / 0.4)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>

      <div className={cn("relative bg-white w-full animate-scale-in", className)}
        style={{ maxWidth: maxWidths[size], borderRadius: 10,
          boxShadow: "0 20px 40px -8px rgb(0 0 0 / .2), 0 8px 16px -4px rgb(0 0 0 / .1)" }}>

        {title && (
          <div className="flex items-start justify-between px-5 py-4"
            style={{ borderBottom: "1px solid #e5e7eb" }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</h2>
              {subtitle && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{subtitle}</p>}
            </div>
            <button onClick={onClose}
              className="rounded transition-colors hover:bg-gray-100 flex items-center justify-center"
              style={{ width: 28, height: 28, color: "#9ca3af", marginLeft: 12, flexShrink: 0 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        <div className="p-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4"
            style={{ borderTop: "1px solid #e5e7eb" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
