"use client";
import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import Button from "./Button";

interface Props {
  open: boolean;
  title: string;
  /** Main message — keep it to one or two short sentences. */
  message: React.ReactNode;
  /** Optional highlighted block, e.g. "12 → 1212 units". */
  highlight?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONES = {
  danger: {
    icon: "bg-red-500/10 text-red-600 dark:text-red-400",
    button: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    button: "",
  },
};

/**
 * A blocking yes/no step for actions that are annoying to undo — used before
 * an unusually large stock entry is saved, and before an entry is reversed.
 */
const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  message,
  highlight,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "warning",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const toneStyles = TONES[tone];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={() => !loading && onCancel()}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border shadow-2xl p-5 flex flex-col gap-4 animate-[confirmIn_0.18s_ease-out]"
      >
        <style>{`@keyframes confirmIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div className="flex items-start gap-3">
          <span className={`shrink-0 w-10 h-10 rounded-xl grid place-items-center ${toneStyles.icon}`}>
            <AlertTriangle size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base">{title}</h3>
            <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
            className="shrink-0 p-1.5 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        {highlight && (
          <div className="rounded-xl border bg-muted/40 px-4 py-3 text-center font-black text-lg">
            {highlight}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={`sm:w-auto w-full ${toneStyles.button}`}
          >
            {loading ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
