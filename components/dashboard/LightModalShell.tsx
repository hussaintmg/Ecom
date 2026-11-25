"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface LightModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgClass?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
  zIndexClass?: string;
}

export const LightModalShell: React.FC<LightModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBgClass = "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  maxWidthClass = "max-w-2xl",
  children,
  zIndexClass = "z-50",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-card border border-border rounded-3xl shadow-2xl ${maxWidthClass} w-full flex flex-col max-h-[92vh] overflow-hidden text-foreground`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className={`p-2.5 rounded-2xl shrink-0 ${iconBgClass}`}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-foreground truncate flex items-center gap-2">
                    {title}
                  </h3>
                  {subtitle && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {subtitle}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
