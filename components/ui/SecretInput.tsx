"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Kopyala butonu göster (varsayılan: true) */
  copyable?: boolean;
  hint?: string;
}

/**
 * Şifreli/gizli alan input'u — göster/gizle (göz) + kopyala butonu (§1.1).
 * Kurum kimlik bilgileri (GİB/SGK/e-Devlet şifreleri) için kullanılır.
 */
export function SecretInput({ label, value, onChange, placeholder, copyable = true, hint }: Props) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const kopyala = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard erişimi yoksa sessizce geç */
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {hint && <span className="font-normal text-slate-400 text-xs"> {hint}</span>}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-16 text-sm text-slate-900 placeholder-slate-400 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
            title={show ? "Gizle" : "Göster"}
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          {copyable && (
            <button
              type="button"
              onClick={kopyala}
              disabled={!value}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded disabled:opacity-40"
              title="Kopyala"
              tabIndex={-1}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
