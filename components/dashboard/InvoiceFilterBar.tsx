"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  X,
  CalendarDays,
  ArrowUpDown,
  User,
  Package,
  Layers,
  ReceiptText,
  DollarSign,
  Tag,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { SellerItem } from "@/context/InvoiceContext";

export interface InvoiceFilterState {
  search: string;
  product: string;
  category: string;
  type: string;
  soldBy: string;
  startDate: string;
  endDate: string;
  datePreset: string;
  sort: string;
}

interface InvoiceFilterBarProps {
  filters: InvoiceFilterState;
  onFilterChange: (newFilters: InvoiceFilterState) => void;
  onReset: () => void;
  products: { _id: string; name: string }[];
  categories: { _id: string; name: string }[];
  sellers: SellerItem[];
  totalInvoices: number;
  totalRevenue: number;
  currency?: string;
  loading?: boolean;
}

export const getDatePresetRange = (preset: string): { start: string; end: string } => {
  const now = new Date();
  const toYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (preset === "today") {
    const str = toYMD(now);
    return { start: str, end: str };
  }
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const str = toYMD(y);
    return { start: str, end: str };
  }
  if (preset === "last7") {
    const s = new Date(now);
    s.setDate(s.getDate() - 6);
    return { start: toYMD(s), end: toYMD(now) };
  }
  if (preset === "last30") {
    const s = new Date(now);
    s.setDate(s.getDate() - 29);
    return { start: toYMD(s), end: toYMD(now) };
  }
  if (preset === "thisMonth") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toYMD(s), end: toYMD(now) };
  }
  if (preset === "lastMonth") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: toYMD(s), end: toYMD(e) };
  }
  return { start: "", end: "" };
};

export const InvoiceFilterBar: React.FC<InvoiceFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  products,
  categories,
  sellers,
  totalInvoices,
  totalRevenue,
  currency = "PKR",
  loading = false,
}) => {
  const [showCustomDate, setShowCustomDate] = useState(
    filters.datePreset === "custom" || Boolean(filters.startDate || filters.endDate)
  );

  const inputClass =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all";

  const handleDatePresetChange = (preset: string) => {
    if (preset === "custom") {
      setShowCustomDate(true);
      onFilterChange({
        ...filters,
        datePreset: "custom",
      });
    } else if (preset === "all" || !preset) {
      setShowCustomDate(false);
      onFilterChange({
        ...filters,
        datePreset: "all",
        startDate: "",
        endDate: "",
      });
    } else {
      setShowCustomDate(false);
      const range = getDatePresetRange(preset);
      onFilterChange({
        ...filters,
        datePreset: preset,
        startDate: range.start,
        endDate: range.end,
      });
    }
  };

  // Count active filters
  const activeFiltersCount = [
    Boolean(filters.search),
    Boolean(filters.product && filters.product !== "all"),
    Boolean(filters.category && filters.category !== "all"),
    Boolean(filters.type && filters.type !== "all"),
    Boolean(filters.soldBy && filters.soldBy !== "all"),
    Boolean(filters.startDate || filters.endDate || (filters.datePreset && filters.datePreset !== "all")),
    Boolean(filters.sort && filters.sort !== "newest"),
  ].filter(Boolean).length;

  const getProductName = (id: string) =>
    products.find((p) => p._id === id)?.name || "Product";
  const getCategoryName = (id: string) =>
    categories.find((c) => c._id === id)?.name || "Category";
  const getSellerName = (id: string) =>
    sellers.find((s) => s._id === id)?.name || "Staff";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filter Card ── */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Filter size={15} />
            </div>
            <h3 className="font-bold text-sm tracking-tight">Filter Invoices</h3>
            {activeFiltersCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={onReset}
              className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 transition-colors"
            >
              <X size={13} /> Clear All
            </button>
          )}
        </div>

        {/* Search bar row */}
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="text"
            placeholder="Search customer name, phone, city, address, product, note, invoice ID, staff..."
            className={`${inputClass} pl-9 pr-9 h-11 text-sm`}
            value={filters.search}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                search: e.target.value,
              })
            }
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Invoice Type */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Tag size={11} /> Invoice Type
            </span>
            <select
              className={inputClass}
              value={filters.type}
              onChange={(e) =>
                onFilterChange({ ...filters, type: e.target.value })
              }
            >
              <option value="all">All Types</option>
              <option value="Sell">Sell (Sale Receipt)</option>
              <option value="Repair">Repair Bill</option>
            </select>
          </label>

          {/* Product */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Package size={11} /> Product
            </span>
            <select
              className={inputClass}
              value={filters.product}
              onChange={(e) =>
                onFilterChange({ ...filters, product: e.target.value })
              }
            >
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {/* Category */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Layers size={11} /> Category
            </span>
            <select
              className={inputClass}
              value={filters.category}
              onChange={(e) =>
                onFilterChange({ ...filters, category: e.target.value })
              }
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Sold By / Staff */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <User size={11} /> Sold By (Staff)
            </span>
            <select
              className={inputClass}
              value={filters.soldBy}
              onChange={(e) =>
                onFilterChange({ ...filters, soldBy: e.target.value })
              }
            >
              <option value="all">All Staff</option>
              {sellers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.role || "staff"})
                </option>
              ))}
            </select>
          </label>

          {/* Date Presets */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CalendarDays size={11} /> Date Period
            </span>
            <select
              className={inputClass}
              value={filters.datePreset || (showCustomDate ? "custom" : "all")}
              onChange={(e) => handleDatePresetChange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </label>

          {/* Sort By */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ArrowUpDown size={11} /> Sort By
            </span>
            <select
              className={inputClass}
              value={filters.sort || "newest"}
              onChange={(e) =>
                onFilterChange({ ...filters, sort: e.target.value })
              }
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </label>
        </div>

        {/* Custom Date Pickers (if Custom or date active) */}
        {showCustomDate && (
          <div className="pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Start Date
              </span>
              <div className="relative">
                <CalendarDays
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <input
                  type="date"
                  className={`${inputClass} pl-8`}
                  value={filters.startDate}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      startDate: e.target.value,
                      datePreset: "custom",
                    })
                  }
                />
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                End Date
              </span>
              <div className="relative">
                <CalendarDays
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={14}
                />
                <input
                  type="date"
                  className={`${inputClass} pl-8`}
                  value={filters.endDate}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      endDate: e.target.value,
                      datePreset: "custom",
                    })
                  }
                />
              </div>
            </label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setShowCustomDate(false);
                  onFilterChange({
                    ...filters,
                    startDate: "",
                    endDate: "",
                    datePreset: "all",
                  });
                }}
              >
                Reset Dates
              </Button>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/40">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">
              Active:
            </span>

            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Search: &ldquo;{filters.search}&rdquo;
                <button
                  onClick={() => onFilterChange({ ...filters, search: "" })}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.type && filters.type !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Type: {filters.type}
                <button
                  onClick={() => onFilterChange({ ...filters, type: "all" })}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.product && filters.product !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Product: {getProductName(filters.product)}
                <button
                  onClick={() => onFilterChange({ ...filters, product: "all" })}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.category && filters.category !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Category: {getCategoryName(filters.category)}
                <button
                  onClick={() => onFilterChange({ ...filters, category: "all" })}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.soldBy && filters.soldBy !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Staff: {getSellerName(filters.soldBy)}
                <button
                  onClick={() => onFilterChange({ ...filters, soldBy: "all" })}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {(filters.startDate || filters.endDate || (filters.datePreset && filters.datePreset !== "all")) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Date:{" "}
                {filters.datePreset && filters.datePreset !== "custom" && filters.datePreset !== "all"
                  ? filters.datePreset
                  : `${filters.startDate || "..."} to ${filters.endDate || "..."}`}
                <button
                  onClick={() => {
                    setShowCustomDate(false);
                    onFilterChange({
                      ...filters,
                      startDate: "",
                      endDate: "",
                      datePreset: "all",
                    });
                  }}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.sort && filters.sort !== "newest" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Sort: {filters.sort}
                <button
                  onClick={() => onFilterChange({ ...filters, sort: "newest" })}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Stats Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <ReceiptText size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Invoices Found
            </span>
            <span className="text-lg font-black text-foreground">
              {totalInvoices.toLocaleString()} {totalInvoices === 1 ? "Receipt" : "Receipts"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <DollarSign size={18} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Total Filtered Revenue
            </span>
            <span className="text-lg font-black text-emerald-600">
              {currency} {Number(totalRevenue || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceFilterBar;
