// components/ui/TooltipCell.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  /** The text shown in the cell (will be truncated if too long) */
  display: string;
  /** Each entry becomes one line in the tooltip (separated by <br />) */
  tooltipLines: string[];
  /** Max characters before truncating with "..." — default 40 */
  maxChars?: number;
  className?: string;
}

const TooltipCell: React.FC<Props> = ({
  display,
  tooltipLines,
  maxChars = 40,
  className = "",
}) => {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Only mount portal on client
  useEffect(() => setMounted(true), []);

  const truncated =
    display.length > maxChars ? display.slice(0, maxChars) + "…" : display;

  const validLines = tooltipLines.filter(Boolean);
  const hasTooltip = validLines.length > 0;

  const show = () => {
    if (!hasTooltip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();

    // Left: clamp so tooltip doesn't go off right edge of viewport
    const left = Math.min(r.left, window.innerWidth - 340);

    const spaceBelow = window.innerHeight - r.bottom;

    if (spaceBelow < 160) {
      // Flip upward: anchor tooltip bottom to element top
      setStyle({
        position: "fixed",
        bottom: window.innerHeight - r.top + 6,
        left: Math.max(8, left),
      });
    } else {
      setStyle({
        position: "fixed",
        top: r.bottom + 6,
        left: Math.max(8, left),
      });
    }
    setVisible(true);
  };

  const tooltip =
    mounted && visible && hasTooltip
      ? createPortal(
          <div
            style={{
              ...style,
              zIndex: 99999,
              background: "#1e293b",
              color: "#f1f5f9",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 11,
              lineHeight: 1.8,
              boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
              maxWidth: "min(320px, calc(100vw - 16px))",
              wordBreak: "break-word",
              pointerEvents: "none",
              // smooth fade-in
              animation: "tooltipFadeIn 0.12s ease",
            }}
          >
            <style>{`@keyframes tooltipFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
            {validLines.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < validLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={show}         // basic mobile support
      onTouchEnd={() => setTimeout(() => setVisible(false), 1800)}
      style={{ cursor: hasTooltip ? "help" : "default" }}
    >
      <span
        style={
          hasTooltip
            ? {
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textUnderlineOffset: 3,
              }
            : undefined
        }
      >
        {truncated}
      </span>
      {tooltip}
    </span>
  );
};

export default TooltipCell;
