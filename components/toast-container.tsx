'use client';

import { useAppStore } from '@/lib/store/assessment-store';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3"
        >
          <span className="mt-0.5 shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
