"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "info" | "error";
type Toast = { id: string; message: string; type: ToastType };

type Ctx = {
  show: (message: string, type?: ToastType, ms?: number) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastView({ toast }: { toast: Toast }) {
  // v1.8.0: semantic tokens (the old emerald/red/sky-200 text was unreadable
  // on the light themes) over an opaque overlay fill, so page content never
  // shows through a toast in any theme.
  const style =
    toast.type === "success"
      ? "border-success/40 bg-success-soft text-success"
      : toast.type === "error"
        ? "border-danger/40 bg-danger-soft text-danger"
        : "border-info/40 bg-info-soft text-info";

  return (
    <div className="rounded-xl bg-[var(--overlay-fill)] shadow-lg">
      <div role={toast.type === "error" ? "alert" : "status"} className={["rounded-xl border px-3 py-2 text-sm font-medium", style].join(" ")}>
        {toast.message}
      </div>
    </div>
  );
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "success", ms = 1400) => {
    const id = crypto?.randomUUID?.() ?? String(Date.now());
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ms);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* ✅ Global Toast stack (top-center) */}
      <div className="fixed top-4 left-1/2 z-9999 -translate-x-1/2 space-y-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className="animate-toast-in">
            <ToastView toast={t} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
