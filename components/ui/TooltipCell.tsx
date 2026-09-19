// components/ui/TooltipCell.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, X } from "lucide-react";

export interface TooltipCellProps {
  /** The text shown in the cell (will be truncated if too long) */
  display?: string;
  text?: string;
  /** Custom children if not using display/text string */
  children?: React.ReactNode;
  /** Each entry becomes one line in the tooltip (separated by <br />) */
  tooltipLines?: string[];
  /** Single string for tooltip content if not using tooltipLines */
  tooltipText?: string;
  /** Optional title shown at the top of the tooltip */
  tooltipTitle?: string;
  /** Max characters before truncating with "…" — default 40 */
  maxChars?: number;
  /** Additional CSS classes for trigger element */
  className?: string;
  /** Whether clicking toggles tooltip open/closed (default: true) */
  clickToOpen?: boolean;
  /** Whether hovering also opens tooltip on non-touch devices (default: true) */
  hoverToOpen?: boolean;
  /** Show subtle dotted underline when text has tooltip (default: auto) */
  showUnderline?: boolean;
  /** Whether to show a quick copy button inside tooltip (default: true) */
  showCopy?: boolean;
}

const TooltipCell: React.FC<TooltipCellProps> = ({
  display,
  text,
  children,
  tooltipLines,
  tooltipText,
  tooltipTitle,
  maxChars = 40,
  className = "",
  clickToOpen = true,
  hoverToOpen = true,
  showUnderline,
  showCopy = true,
}) => {
  const rawText = (text ?? display ?? "").toString();
  const [visible, setVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{
    placement: "top" | "bottom";
    style: React.CSSProperties;
    arrowLeft: number;
  }>({
    placement: "bottom",
    style: {},
    arrowLeft: 16,
  });

  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute truncated text
  const isTruncated = maxChars ? rawText.length > maxChars : false;
  const truncatedText = isTruncated ? rawText.slice(0, maxChars).trimEnd() + "…" : rawText;

  // Determine lines to show in tooltip
  let validLines: string[] = [];
  if (tooltipLines && tooltipLines.length > 0) {
    validLines = tooltipLines.filter(Boolean);
  } else if (tooltipText) {
    validLines = [tooltipText];
  } else if (rawText) {
    validLines = [rawText];
  }

  // A tooltip is meaningful if:
  // 1. Explicit tooltipLines or tooltipText were provided, OR
  // 2. The rawText was truncated
  const hasTooltip =
    validLines.length > 0 &&
    (tooltipLines !== undefined || tooltipText !== undefined || isTruncated);

  const fullTextToCopy = validLines.join("\n");

  // Dynamic positioning logic (above vs below collision detection + mobile clamping)
  const updatePosition = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const tooltipEl = tooltipRef.current;
    const maxW = Math.min(340, Math.max(180, vw - 24));
    const actualW = tooltipEl ? Math.min(tooltipEl.offsetWidth || maxW, maxW) : Math.min(260, maxW);
    const actualH = tooltipEl ? tooltipEl.offsetHeight || 120 : 120;

    const spaceAbove = r.top;
    const spaceBelow = vh - r.bottom;

    // Place ABOVE if spaceAbove is greater and enough room for tooltip, OR if space below is too tight
    const placeAbove =
      (spaceAbove >= actualH + 16 && spaceAbove > spaceBelow) ||
      (spaceBelow < actualH + 16 && spaceAbove >= actualH + 16);

    // Desired horizontal position (centered on trigger element)
    const triggerCenter = r.left + r.width / 2;
    let left = triggerCenter - actualW / 2;

    // Clamp inside viewport margins (at least 12px from edge)
    left = Math.max(12, Math.min(left, vw - actualW - 12));

    // Arrow pointer relative to tooltip
    const arrowLeft = Math.max(16, Math.min(triggerCenter - left, actualW - 16));

    const newStyle: React.CSSProperties = {
      position: "fixed",
      left: `${left}px`,
      maxWidth: `${maxW}px`,
      width: "max-content",
      zIndex: 99999,
    };

    if (placeAbove) {
      newStyle.bottom = `${vh - r.top + 8}px`;
    } else {
      newStyle.top = `${r.bottom + 8}px`;
    }

    setPosition({
      placement: placeAbove ? "top" : "bottom",
      style: newStyle,
      arrowLeft,
    });
  }, []);

  // Update position on scroll or resize when visible
  useEffect(() => {
    if (!visible) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [visible, updatePosition]);

  // Recalculate accurately once tooltip element is mounted in DOM
  useEffect(() => {
    if (visible) {
      updatePosition();
      const raf = requestAnimationFrame(() => {
        updatePosition();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [visible, updatePosition]);

  // Outside click & Escape dismissal
  useEffect(() => {
    if (!visible) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setVisible(false);
        setIsPinned(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
        setIsPinned(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  const show = (pin = false) => {
    if (!hasTooltip) return;
    setVisible(true);
    if (pin) setIsPinned(true);
  };

  const hide = () => {
    if (isPinned) return;
    setVisible(false);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!hasTooltip || !clickToOpen) return;
    e.stopPropagation();
    if (visible && isPinned) {
      setVisible(false);
      setIsPinned(false);
    } else {
      show(true);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fullTextToCopy) return;
    navigator.clipboard.writeText(fullTextToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shouldUnderline =
    showUnderline !== undefined ? showUnderline : hasTooltip && isTruncated;

  const tooltipPortal =
    mounted && visible && hasTooltip
      ? createPortal(
          <div
            ref={tooltipRef}
            style={{
              ...position.style,
              background: "#0f172a",
              color: "#f8fafc",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12,
              lineHeight: 1.5,
              boxShadow:
                "0 12px 32px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12)",
              wordBreak: "break-word",
              pointerEvents: "auto",
              animation:
                position.placement === "top"
                  ? "tooltipSlideUp 0.14s cubic-bezier(0.16, 1, 0.3, 1)"
                  : "tooltipSlideDown 0.14s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes tooltipSlideDown {
                from { opacity: 0; transform: translateY(-4px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes tooltipSlideUp {
                from { opacity: 0; transform: translateY(4px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>

            {/* Caret Arrow */}
            {position.placement === "top" ? (
              <div
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: position.arrowLeft,
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid #0f172a",
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  top: -6,
                  left: position.arrowLeft,
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderBottom: "6px solid #0f172a",
                }}
              />
            )}

            {/* Header: Title / Actions */}
            <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {tooltipTitle || (isTruncated ? "Full Details" : "Information")}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {showCopy && fullTextToCopy && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title={copied ? "Copied!" : "Copy full text"}
                    aria-label="Copy full text"
                  >
                    {copied ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setVisible(false);
                    setIsPinned(false);
                  }}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Close"
                  aria-label="Close tooltip"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Body Lines */}
            <div className="max-h-60 overflow-y-auto space-y-1 text-slate-100 pr-1">
              {validLines.map((line, i) => (
                <div key={i} className="text-xs">
                  {line}
                </div>
              ))}
            </div>

            {/* Hint footer */}
            <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>{copied ? "Copied to clipboard!" : "Click outside to close"}</span>
              <span className="opacity-50 text-[9px]">Esc</span>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <span
      ref={ref}
      className={`inline-flex items-center max-w-full ${className}`}
      onClick={handleTriggerClick}
      onMouseEnter={() => {
        if (hoverToOpen) show(false);
      }}
      onMouseLeave={hide}
      style={{
        cursor: hasTooltip ? "pointer" : undefined,
      }}
      title={hasTooltip && !visible ? "Click to view full text" : undefined}
    >
      <span
        className="truncate"
        style={
          shouldUnderline
            ? {
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textUnderlineOffset: 3,
                textDecorationColor: "rgba(156, 163, 175, 0.7)",
              }
            : undefined
        }
      >
        {children || truncatedText}
      </span>
      {tooltipPortal}
    </span>
  );
};

export default TooltipCell;
