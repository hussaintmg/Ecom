"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useStock, StockLogEntry } from "@/context/StockContext";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  MAX_STOCK_CHANGE,
  isSuspiciousStockChange,
} from "@/constants/stock";
import {
  RefreshCw,
  Plus,
  Minus,
  Equal,
  Clock,
  TrendingUp,
  Undo2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type Mode = "add" | "remove" | "set";

const MODES: { value: Mode; label: string; short: string; icon: React.ReactNode }[] = [
  { value: "add", label: "Add Stock", short: "Add", icon: <Plus size={13} /> },
  { value: "remove", label: "Remove Stock", short: "Remove", icon: <Minus size={13} /> },
  { value: "set", label: "Set Exact", short: "Set", icon: <Equal size={13} /> },
];

const inputClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

/* ───────────────────────── Stock history ───────────────────────── */

const StockHistory = ({
  productId,
  onChanged,
}: {
  productId: string;
  onChanged: () => void | Promise<void>;
}) => {
  const { logs, loading, fetchLogs, undoStockChange } = useStock();
  const [pendingUndo, setPendingUndo] = useState<StockLogEntry | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    fetchLogs(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const confirmUndo = async () => {
    if (!pendingUndo) return;
    setUndoing(true);
    const ok = await undoStockChange(productId, pendingUndo._id);
    setUndoing(false);
    setPendingUndo(null);
    if (ok) await onChanged();
  };

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/60" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
        <Clock size={28} className="opacity-30" />
        <p className="text-sm">No stock history yet.</p>
      </div>
    );
  }

  /** An entry can be undone once, and only if it isn't itself a correction. */
  const canUndo = (log: StockLogEntry) => !log.reverted && !log.reversalOf;

  const statusBadge = (log: StockLogEntry) => {
    if (log.reversalOf)
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
          <Undo2 size={9} /> Correction
        </span>
      );
    if (log.reverted)
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md whitespace-nowrap">
          <ShieldCheck size={9} /> Undone
        </span>
      );
    return null;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      <div className="flex flex-col gap-4 mt-2">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3 text-center">Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className={`group transition-colors hover:bg-primary/[0.04] ${
                    log.reverted ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3 border-l-2 border-transparent group-hover:border-primary transition-colors">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        log.change > 0 ? "text-emerald-600" : "text-red-600"
                      } ${log.reverted ? "line-through" : ""}`}
                    >
                      {log.change > 0 && "+"}
                      {log.change}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                    {log.previousStock !== undefined && log.previousStock !== null ? (
                      <span className="inline-flex items-center gap-1">
                        {log.previousStock}
                        <ArrowRight size={11} className="opacity-60" />
                        <span className="text-foreground">{log.resultingStock}</span>
                      </span>
                    ) : (
                      log.resultingStock
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-2 break-words">{log.description}</span>
                      {statusBadge(log)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {log.performedBy?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canUndo(log) ? (
                      <button
                        onClick={() => setPendingUndo(log)}
                        title="Undo this entry"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold text-amber-600 hover:bg-amber-500/10 hover:border-amber-500/40 transition-colors"
                      >
                        <Undo2 size={12} /> Undo
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {logs.map((log) => (
            <div
              key={log._id}
              className={`flex items-start gap-3 p-3 rounded-xl border bg-card shadow-sm transition-colors hover:border-primary/30 ${
                log.reverted ? "opacity-60" : ""
              }`}
            >
              <div
                className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
                  log.change > 0
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                }`}
              >
                <TrendingUp size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-bold ${
                      log.change > 0 ? "text-emerald-600" : "text-red-600"
                    } ${log.reverted ? "line-through" : ""}`}
                  >
                    {log.change > 0 ? "+" : ""}
                    {log.change}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                    {log.previousStock !== undefined && log.previousStock !== null
                      ? `${log.previousStock} → ${log.resultingStock} units`
                      : `→ ${log.resultingStock} units`}
                  </span>
                  {statusBadge(log)}
                </div>
                <p className="text-sm text-foreground mt-0.5 break-words">{log.description}</p>
                <div className="flex items-center justify-between gap-2 mt-2 border-t pt-2">
                  <div className="text-[10px] text-muted-foreground">
                    <span>{formatDate(log.createdAt)}</span>
                    {log.performedBy && <span> • by {log.performedBy.name}</span>}
                  </div>
                  {canUndo(log) && (
                    <button
                      onClick={() => setPendingUndo(log)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold text-amber-600 active:scale-95 transition-transform"
                    >
                      <Undo2 size={11} /> Undo
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingUndo}
        tone="warning"
        title="Undo this stock entry?"
        message={
          <>
            The stock will move back by{" "}
            <strong className="text-foreground">
              {pendingUndo ? Math.abs(pendingUndo.change) : 0}
            </strong>{" "}
            units. The original entry stays in the history with an “Undone” mark, and a
            correction entry is added so the trail stays complete.
          </>
        }
        highlight={
          pendingUndo ? (
            <span className="inline-flex items-center gap-2">
              {pendingUndo.resultingStock}
              <ArrowRight size={16} className="opacity-60" />
              <span className="text-emerald-600">
                {pendingUndo.resultingStock - pendingUndo.change}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">units</span>
            </span>
          ) : null
        }
        confirmLabel="Yes, undo it"
        loading={undoing}
        onConfirm={confirmUndo}
        onCancel={() => setPendingUndo(null)}
      />
    </>
  );
};

/* ───────────────────── Adjust + history together ───────────────────── */

interface Props {
  productId: string;
  /** Current stock on hand — used for the live preview and the guard rails. */
  currentStock: number;
  /** Called after any successful change so the page can reload the product. */
  onChanged: () => void | Promise<void>;
}

/**
 * Stock management for one product: a guarded adjustment form plus the full
 * history with a one-click undo.
 *
 * The guard rails exist because the common mistake is a slip of the finger —
 * an extra zero, or an amount typed into the wrong product. So the form
 * previews the resulting number before saving, asks again when the amount
 * looks out of proportion, and every entry can be reversed afterwards.
 */
const StockManager: React.FC<Props> = ({ productId, currentStock, onChanged }) => {
  const { addStockChange, setStockTo } = useStock();

  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const parsed = amount.trim() === "" ? NaN : Number(amount);
  const isValidNumber = Number.isFinite(parsed) && Number.isInteger(parsed);

  const resultingStock = useMemo(() => {
    if (!isValidNumber) return currentStock;
    if (mode === "add") return currentStock + parsed;
    if (mode === "remove") return currentStock - parsed;
    return parsed;
  }, [mode, parsed, isValidNumber, currentStock]);

  const delta = resultingStock - currentStock;

  const error = (() => {
    if (amount.trim() === "") return null;
    if (!isValidNumber) return "Enter a whole number — no decimals.";
    if (mode !== "set" && parsed <= 0) return "Quantity must be at least 1.";
    if (mode === "set" && parsed < 0) return "Stock cannot be negative.";
    if (Math.abs(parsed) > MAX_STOCK_CHANGE)
      return `That is above the ${MAX_STOCK_CHANGE.toLocaleString()} limit — please check the amount.`;
    if (resultingStock < 0)
      return `Only ${currentStock} units in stock — you cannot remove ${parsed}.`;
    if (mode === "set" && parsed === currentStock)
      return `Stock is already ${currentStock}. Nothing to correct.`;
    return null;
  })();

  const ready = !error && isValidNumber && reason.trim().length > 0 && delta !== 0;

  const suspicious = isValidNumber && isSuspiciousStockChange(delta, currentStock);

  const save = async () => {
    setSaving(true);
    const ok =
      mode === "set"
        ? await setStockTo(productId, parsed, reason.trim())
        : await addStockChange(productId, mode === "add" ? parsed : -parsed, reason.trim());
    setSaving(false);
    setConfirmOpen(false);
    if (ok) {
      setAmount("");
      setReason("");
      await onChanged();
    }
  };

  const submit = () => {
    if (!ready) return;
    // Double-check anything that looks like a typo before touching the stock.
    if (suspicious) {
      setConfirmOpen(true);
      return;
    }
    save();
  };

  const step = (by: number) => {
    const base = isValidNumber ? parsed : mode === "set" ? currentStock : 0;
    const next = Math.max(0, base + by);
    setAmount(String(next));
  };

  const modeCopy: Record<Mode, { title: string; hint: string; button: string; classes: string }> = {
    add: {
      title: "Quantity to Add *",
      hint: "New shipment, returned item, or a stock count that came out higher.",
      button: "Confirm Addition",
      classes: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    remove: {
      title: "Quantity to Remove *",
      hint: "Damaged, lost, or wrongly added stock that has to come back out.",
      button: "Confirm Removal",
      classes: "bg-red-600 hover:bg-red-700 text-white",
    },
    set: {
      title: "Correct Stock To *",
      hint: "Type the number that is actually on the shelf — the difference is worked out for you.",
      button: "Correct Stock",
      classes: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Adjustment form ── */}
      <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm transition-colors hover:border-primary/20">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-base">Manage Stock</h2>
          <span
            className={`text-2xl font-black ${
              currentStock > 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {currentStock}
          </span>
        </div>

        {/* Mode switch */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/60">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMode(m.value);
                setAmount("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === m.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.short}</span>
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {modeCopy[mode].title}
          </span>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Decrease"
              className="shrink-0 w-11 rounded-xl border hover:bg-muted active:scale-95 transition-all grid place-items-center"
            >
              <Minus size={15} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              className={`${inputClass} text-center font-bold text-base`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={mode === "set" ? String(currentStock) : "e.g. 50"}
            />
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Increase"
              className="shrink-0 w-11 rounded-xl border hover:bg-muted active:scale-95 transition-all grid place-items-center"
            >
              <Plus size={15} />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">{modeCopy[mode].hint}</span>
        </label>

        {/* Live preview — the number you will end up with */}
        {isValidNumber && !error && delta !== 0 && (
          <div className="rounded-xl border bg-muted/30 px-4 py-3 flex items-center justify-center gap-3 text-sm font-bold">
            <span className="text-muted-foreground">{currentStock}</span>
            <ArrowRight size={14} className="opacity-60" />
            <span className={delta > 0 ? "text-emerald-600" : "text-red-600"}>
              {resultingStock}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                delta > 0
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          </div>
        )}

        {error && (
          <p className="flex items-start gap-1.5 text-xs font-semibold text-red-600">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        {!error && suspicious && isValidNumber && (
          <p className="flex items-start gap-1.5 text-xs font-semibold text-amber-600">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            That is a big jump for this product — you will be asked to confirm it.
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Reason *
          </span>
          <textarea
            className={`${inputClass} min-h-17.5 resize-y`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              mode === "add"
                ? "e.g. New shipment from wholesale..."
                : mode === "remove"
                  ? "e.g. Wrong quantity added earlier, removing extra units"
                  : "e.g. Physical count done, correcting to actual shelf quantity"
            }
          />
        </label>

        <Button
          onClick={submit}
          disabled={saving || !ready}
          className={`gap-2 w-full ${modeCopy[mode].classes}`}
        >
          {saving ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : mode === "remove" ? (
            <Minus size={14} />
          ) : mode === "set" ? (
            <Equal size={14} />
          ) : (
            <Plus size={14} />
          )}
          {modeCopy[mode].button}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          Made a mistake? Every entry below can be undone with one click.
        </p>
      </div>

      {/* ── History ── */}
      <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
        <h2 className="font-bold text-base">Stock Updates History</h2>
        <StockHistory productId={productId} onChanged={onChanged} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        tone="warning"
        title="That is an unusually large change"
        message={
          <>
            Please double-check the amount before it is saved — an extra digit is the most
            common stock mistake. Current stock is{" "}
            <strong className="text-foreground">{currentStock}</strong>.
          </>
        }
        highlight={
          <span className="inline-flex items-center gap-2">
            {currentStock}
            <ArrowRight size={16} className="opacity-60" />
            <span className={delta > 0 ? "text-emerald-600" : "text-red-600"}>
              {resultingStock}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">units</span>
          </span>
        }
        confirmLabel="Yes, save it"
        cancelLabel="Let me check"
        loading={saving}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default StockManager;
