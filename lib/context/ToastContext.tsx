"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast { id: string; type: ToastType; title: string; message?: string; }

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };

const iconColor = {
  success: "#16a34a", error: "#dc2626", warning: "#ca8a04", info: "#2563eb",
};

const bg = {
  success: "#f0fdf4", error: "#fef2f2", warning: "#fefce8", info: "#eff6ff",
};

const border = {
  success: "#bbf7d0", error: "#fecaca", warning: "#fde047", info: "#bfdbfe",
};

const textColor = {
  success: "#166534", error: "#991b1b", warning: "#713f12", info: "#1e40af",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { id, type, title, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const toast = {
    success: (t: string, m?: string) => addToast("success", t, m),
    error:   (t: string, m?: string) => addToast("error",   t, m),
    warning: (t: string, m?: string) => addToast("warning", t, m),
    info:    (t: string, m?: string) => addToast("info",    t, m),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className="animate-fade-up"
              style={{ display: "flex", alignItems: "flex-start", gap: 10,
                padding: "11px 14px", borderRadius: 8, maxWidth: 340,
                background: bg[t.type], border: `1px solid ${border[t.type]}`,
                boxShadow: "0 4px 12px rgb(0 0 0 / .1)", pointerEvents: "auto" }}>
              <Icon style={{ width: 14, height: 14, color: iconColor[t.type],
                flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: textColor[t.type] }}>{t.title}</p>
                {t.message && (
                  <p style={{ fontSize: 11, color: textColor[t.type], opacity: 0.75, marginTop: 2 }}>
                    {t.message}
                  </p>
                )}
              </div>
              <button onClick={() => dismiss(t.id)}
                style={{ color: textColor[t.type], opacity: 0.5, flexShrink: 0 }}
                className="hover:opacity-100">
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
