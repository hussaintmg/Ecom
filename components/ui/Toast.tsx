"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastPosition = "top-left" | "top-right" | "top-center" | "bottom-left" | "bottom-right" | "bottom-center";

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type = "info", duration = 5000, onClose }) => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose, isPaused]);

  const icons = {
    success: <CheckCircle2 className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-rose-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertTriangle className="text-amber-500" size={20} />,
  };

  const bgStyles = {
    success: "bg-emerald-50/80 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-800/20",
    error: "bg-rose-50/80 border-rose-200/50 dark:bg-rose-950/20 dark:border-rose-800/20",
    info: "bg-blue-50/80 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/20",
    warning: "bg-amber-50/80 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        "group relative flex items-center gap-4 p-4 pr-10 rounded-2xl border backdrop-blur-xl shadow-2xl min-w-[320px] max-w-md",
        bgStyles[type]
      )}
    >
      <div className="shrink-0">{icons[type]}</div>
      <div className="flex-1 text-sm font-semibold tracking-tight text-foreground/90">
        {message}
      </div>
      <button
        onClick={() => onClose(id)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={14} className="text-muted-foreground" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-10 w-full overflow-hidden rounded-b-2xl">
        {!isPaused && (
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            className="h-full bg-foreground"
          />
        )}
      </div>
    </motion.div>
  );
};

// Singleton and Internal Event System
type ToastEvent = {
  message: string;
  type: ToastType;
  duration?: number;
};

const listeners = new Set<(toast: ToastEvent & { id: string }) => void>();

export const toast = {
  show: (message: string, type: ToastType = "info", duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    listeners.forEach((l) => l({ id, message, type, duration }));
  },
  success: (msg: string, dur?: number) => toast.show(msg, "success", dur),
  error: (msg: string, dur?: number) => toast.show(msg, "error", dur),
  info: (msg: string, dur?: number) => toast.show(msg, "info", dur),
  warning: (msg: string, dur?: number) => toast.show(msg, "warning", dur),
};

export const ToastProvider: React.FC<{ position?: ToastPosition }> = ({ position = "top-right" }) => {
  const [toasts, setToasts] = useState<(ToastEvent & { id: string })[]>([]);

  useEffect(() => {
    const handler = (t: ToastEvent & { id: string }) => setToasts((prev) => [...prev, t]);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const positionStyles: Record<ToastPosition, string> = {
    "top-left": "top-6 left-6 flex-col",
    "top-right": "top-6 right-6 flex-col",
    "top-center": "top-6 left-1/2 -translate-x-1/2 flex-col",
    "bottom-left": "bottom-6 left-6 flex-col-reverse",
    "bottom-right": "bottom-6 right-6 flex-col-reverse",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2 flex-col-reverse",
  };

  return (
    <div className={cn("fixed z-9999 flex gap-3 pointer-events-none", positionStyles[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onClose={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
