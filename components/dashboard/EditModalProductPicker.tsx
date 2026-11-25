"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Package, Plus, RefreshCw, Check, X, SlidersHorizontal } from "lucide-react";

export interface CatalogProductOption {
  _id: string;
  name: string;
  price?: number;
  stock?: number;
  images?: any[];
  category?: { _id: string; name: string } | string;
  barcode?: string;
}

type StockFilterValue = "All" | "InStock" | "OutOfStock";

interface EditModalProductPickerProps {
  onSelect: (product: CatalogProductOption) => void;
  onCancel?: () => void;
  placeholder?: string;
  buttonLabel?: string;
  requireStock?: boolean;
  compact?: boolean;
  excludeIds?: string[];
  autoOpen?: boolean;
  defaultStockFilter?: StockFilterValue;
}

export const EditModalProductPicker: React.FC<EditModalProductPickerProps> = ({
  onSelect,
  onCancel,
  placeholder = "Search product by name, barcode or description...",
  buttonLabel = "Add Product",
  requireStock = false,
  compact = false,
  excludeIds = [],
  autoOpen = false,
  defaultStockFilter = "All",
}) => {
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilterValue>(defaultStockFilter);
  const [results, setResults] = useState<CatalogProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "12");
        if (query.trim()) params.set("search", query.trim());
        if (stockFilter !== "All") params.set("stock", stockFilter);
        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (active && res.ok) {
          setResults(data.products || []);
        }
      } catch {
        // silent network fallback
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, stockFilter, open]);

  if (!open && !autoOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/25 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-600/40 active:scale-[0.98] transition-all cursor-pointer shadow-2xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
      >
        <Plus size={14} />
        {buttonLabel}
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.99 }}
      transition={{ duration: 0.16 }}
      className={`w-full min-w-0 max-w-full rounded-2xl border border-border bg-card shadow-lg overflow-hidden ${
        compact ? "p-2.5" : "p-3"
      } space-y-2.5`}
    >
      {/* Top Bar: Search + Stock Filter + Close */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 sm:flex-initial">
            <SlidersHorizontal
              size={13}
              className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none"
            />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilterValue)}
              aria-label="Filter by stock status"
              className="w-full sm:w-36 rounded-xl border border-input bg-background pl-8 pr-2.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="All">All Stock</option>
              <option value="InStock">In Stock</option>
              <option value="OutOfStock">Out of Stock</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStockFilter(defaultStockFilter);
              if (onCancel) {
                onCancel();
              } else {
                setOpen(false);
              }
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0"
            title="Close picker"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Results Dropdown List */}
      <div className="w-full max-h-56 overflow-y-auto divide-y divide-border/60 rounded-xl border border-border/80 bg-background">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
            <RefreshCw size={14} className="animate-spin text-emerald-600" />
            Searching catalog...
          </div>
        ) : results.length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground">
            No matching products found.
          </div>
        ) : (
          results.map((prod) => {
            const imgUrl =
              typeof prod.images?.[0] === "string"
                ? prod.images[0]
                : prod.images?.[0]?.url || "";
            const stock = Number(prod.stock ?? 0);
            const outOfStock = requireStock && stock <= 0;
            const isExcluded = excludeIds.includes(prod._id);

            return (
              <button
                key={prod._id}
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  onSelect(prod);
                  setQuery("");
                  if (!autoOpen) setOpen(false);
                }}
                className="w-full min-w-0 flex items-center justify-between gap-2.5 p-2.5 text-left hover:bg-muted/60 transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={prod.name}
                      className="w-8 h-8 rounded-lg object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                      <Package size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      {prod.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {typeof prod.category === "object" ? prod.category?.name : "Category"}
                      {prod.barcode ? ` • ${prod.barcode}` : ""} • Rs.{" "}
                      {Number(prod.price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      stock > 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                        : "bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30"
                    }`}
                  >
                    Stock: {stock}
                  </span>
                  {isExcluded ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Plus
                      size={14}
                      className="text-muted-foreground group-hover:text-emerald-600 transition-colors"
                    />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
