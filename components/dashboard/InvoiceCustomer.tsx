"use client";
import React, { useEffect, useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  StickyNote,
  Copy,
  Check,
  X,
  MessageCircle,
  ReceiptText,
  CalendarDays,
  UserCog,
  Package,
} from "lucide-react";

export interface InvoiceCustomerData {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerNote?: string;
}

/** Stable per-customer accent so the same person always looks the same. */
const AVATAR_TONES = [
  "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-sky-500/20",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-violet-500/20",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20",
];

export const customerInitials = (name?: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const customerTone = (name?: string) => {
  const key = (name || "Walk-in").trim().toLowerCase();
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
};

/** Digits only, so tel:/wa.me links work whatever format was typed. */
const dialable = (phone?: string) => (phone || "").replace(/[^\d+]/g, "");

const waNumber = (phone?: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  // Local Pakistani format (03xxxxxxxxx) → international, otherwise as-is.
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
};

/* ─────────────────────────── Copy button ─────────────────────────── */

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — nothing useful to do */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      className="p-1.5 rounded-lg border text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors"
    >
      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
    </button>
  );
};

/* ───────────────────── Compact cell for the table ───────────────────── */

interface CellProps {
  invoice: InvoiceCustomerData;
  onOpen: () => void;
  /**
   * "contact" shows phone/city under the name — right for mobile cards.
   * "hint" just invites a click, for tables that already have a Contact
   * column and would otherwise repeat the phone twice on one row.
   */
  secondary?: "contact" | "hint";
}

/**
 * The Customer column: avatar, name, phone and city at a glance, with the
 * full record one click away. Keeps the table narrow while still showing
 * far more than a bare name.
 */
export const CustomerCell: React.FC<CellProps> = ({
  invoice,
  onOpen,
  secondary = "contact",
}) => {
  const name = invoice.customerName || "Walk-in Customer";
  const phone = invoice.customerPhone;
  const city = invoice.customerCity;
  const extras = [
    invoice.customerEmail,
    invoice.customerAddress,
    invoice.customerNote,
  ].filter(Boolean).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      title="View full customer details"
      className="group/customer flex items-center gap-2.5 text-left w-full rounded-xl px-1.5 py-1 -mx-1.5 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer"
    >
      <span
        className={`shrink-0 w-9 h-9 rounded-full grid place-items-center text-[11px] font-black ring-1 transition-transform group-hover/customer:scale-105 ${customerTone(
          name
        )}`}
      >
        {customerInitials(name)}
      </span>
      <span className="min-w-0 flex flex-col">
        <span className="font-semibold text-foreground text-sm truncate max-w-[190px] group-hover/customer:text-primary transition-colors">
          {name}
        </span>
        <span className="text-[11px] text-muted-foreground truncate max-w-[190px] flex items-center gap-1">
          {secondary === "hint" ? (
            <span className="opacity-70 group-hover/customer:text-primary group-hover/customer:opacity-100 transition-colors">
              View full details
            </span>
          ) : phone ? (
            <>
              <Phone size={10} className="shrink-0" /> {phone}
            </>
          ) : city ? (
            <>
              <MapPin size={10} className="shrink-0" /> {city}
            </>
          ) : (
            <span className="italic opacity-70">No contact saved</span>
          )}
          {extras > 0 && secondary !== "hint" && (
            <span className="ml-0.5 shrink-0 text-[9px] font-bold text-primary bg-primary/10 px-1.5 rounded-full">
              +{extras}
            </span>
          )}
        </span>
      </span>
    </button>
  );
};

/* ───────────────────────── Details modal ───────────────────────── */

interface Row {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  extra?: React.ReactNode;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  invoice: any;
  /** "Rs." on the admin screens, "PKR" on the owner screens. */
  currency?: string;
}

export const CustomerDetailsModal: React.FC<ModalProps> = ({
  open,
  onClose,
  invoice,
  currency = "Rs.",
}) => {
  // Close on Escape and lock the page behind the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !invoice) return null;

  const name = invoice.customerName || "Walk-in Customer";
  const items: any[] = invoice.products ?? [];
  const totalQty = items.reduce((s, p) => s + (p.quantity ?? 0), 0);
  const totalPrice = items.reduce(
    (s, p) => s + (p.salePrice ?? 0) * (p.quantity ?? 1),
    0
  );

  const rows: Row[] = [
    {
      icon: <Phone size={14} />,
      label: "Phone",
      value: invoice.customerPhone,
      href: invoice.customerPhone ? `tel:${dialable(invoice.customerPhone)}` : undefined,
      extra: invoice.customerPhone ? (
        <a
          href={`https://wa.me/${waNumber(invoice.customerPhone)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Message on WhatsApp"
          className="p-1.5 rounded-lg border text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors"
        >
          <MessageCircle size={13} />
        </a>
      ) : null,
    },
    {
      icon: <Mail size={14} />,
      label: "Email",
      value: invoice.customerEmail,
      href: invoice.customerEmail ? `mailto:${invoice.customerEmail}` : undefined,
    },
    { icon: <Building2 size={14} />, label: "City / Area", value: invoice.customerCity },
    { icon: <MapPin size={14} />, label: "Address", value: invoice.customerAddress },
    { icon: <StickyNote size={14} />, label: "Note", value: invoice.customerNote },
  ];

  const filledRows = rows.filter((r) => r.value);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Customer details"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-lg max-h-[88vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border shadow-2xl animate-[customerSheetIn_0.18s_ease-out]"
      >
        <style>{`@keyframes customerSheetIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b px-5 py-4 flex items-start justify-between gap-3 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`shrink-0 w-11 h-11 rounded-full grid place-items-center text-sm font-black ring-1 ${customerTone(
                name
              )}`}
            >
              {customerInitials(name)}
            </span>
            <div className="min-w-0">
              <h3 className="font-black text-base truncate">{name}</h3>
              <p className="text-[11px] text-muted-foreground">
                Customer on this {invoice.type === "Repair" ? "repair bill" : "invoice"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 rounded-lg border hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Contact details */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Contact & Address
            </h4>
            {filledRows.length === 0 ? (
              <p className="text-sm text-muted-foreground italic border border-dashed rounded-xl p-4 text-center">
                Only a name was saved for this customer.
              </p>
            ) : (
              <div className="flex flex-col divide-y rounded-xl border overflow-hidden">
                {filledRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start gap-3 px-3.5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <span className="mt-0.5 text-muted-foreground shrink-0">{row.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {row.label}
                      </p>
                      {row.href ? (
                        <a
                          href={row.href}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline break-words"
                        >
                          {row.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-foreground break-words whitespace-pre-wrap">
                          {row.value}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {row.extra}
                      <CopyButton value={row.value as string} label={row.label} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice summary */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Invoice
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border p-3 hover:border-primary/30 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarDays size={11} /> Date
                </p>
                <p className="text-sm font-semibold mt-0.5">
                  {invoice.createdAt
                    ? new Date(invoice.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border p-3 hover:border-primary/30 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ReceiptText size={11} /> Type
                </p>
                <p className="text-sm font-semibold mt-0.5">{invoice.type || "Sell"}</p>
              </div>
              <div className="rounded-xl border p-3 hover:border-primary/30 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <UserCog size={11} /> Sold By
                </p>
                <p className="text-sm font-semibold mt-0.5 truncate">
                  {invoice.soldBy?.name || "Unknown"}
                </p>
              </div>
              <div className="rounded-xl border p-3 bg-emerald-500/5 border-emerald-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Total
                </p>
                <p className="text-sm font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {currency} {(invoice.totalAmount ?? totalPrice).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Package size={12} /> Items ({totalQty})
            </h4>
            <div className="flex flex-col gap-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No items recorded.</p>
              ) : (
                items.map((p: any, i: number) => (
                  <div
                    key={p._id || i}
                    className="rounded-xl border px-3.5 py-2.5 flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {p.product?.name || "Deleted Product"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.category?.name || "Uncategorized"}
                        {p.description ? ` • ${p.description}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600 whitespace-nowrap">
                        {currency} {((p.salePrice ?? 0) * (p.quantity ?? 1)).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Qty: {p.quantity ?? 0}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
