"use client";

import { useEffect } from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

type Props = ConfirmOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmModal({
  open,
  title = "Onay",
  message,
  confirmLabel = "Evet",
  cancelLabel = "İptal",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const isDanger = variant === "danger";

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200/80">
        <div className="p-6">
          <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <p id="confirm-message" className="mt-2 text-slate-600">
            {message}
          </p>
        </div>
        <div className="flex gap-3 justify-end px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50 ${
              isDanger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Yükleniyor…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
