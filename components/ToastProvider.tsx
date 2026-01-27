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
  const style =
    toast.type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : toast.type === "error"
        ? "border-red-500/30 bg-red-500/10 text-red-200"
        : "border-sky-500/30 bg-sky-500/10 text-sky-200";

  return (
    <div className={["surface-soft px-3 py-2 text-sm", style].join(" ")}>
      {toast.message}
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
