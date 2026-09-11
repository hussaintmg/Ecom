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
  CreditCard,
  DollarSign,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { CreatorItem } from "@/context/CreditSaleContext";
import { getDatePresetRange } from "./InvoiceFilterBar";

export interface CreditSaleFilterState {
  search: string;
  status: string;
  balanceStatus: string;
  product: string;
  category: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  datePreset: string;
  sort: string;
}

interface CreditSaleFilterBarProps {
  filters: CreditSaleFilterState;
  onFilterChange: (newFilters: CreditSaleFilterState) => void;
  onReset: () => void;
  products: { _id: string; name: string }[];
  categories: { _id: string; name: string }[];
  creators: CreatorItem[];
  totalRecords: number;
  totalAmountSum: number;
  totalRemainingSum: number;
  totalPaidSum: number;
  currency?: string;
  loading?: boolean;
}

export const CreditSaleFilterBar: React.FC<CreditSaleFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  products,
  categories,
  creators,
  totalRecords,
  totalAmountSum,
  totalRemainingSum,
  totalPaidSum,
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

  const activeFiltersCount = [
    Boolean(filters.search),
    Boolean(filters.status && filters.status !== "all"),
    Boolean(filters.balanceStatus && filters.balanceStatus !== "all"),
    Boolean(filters.product && filters.product !== "all"),
    Boolean(filters.category && filters.category !== "all"),
    Boolean(filters.createdBy && filters.createdBy !== "all"),
    Boolean(filters.startDate || filters.endDate || (filters.datePreset && filters.datePreset !== "all")),
    Boolean(filters.sort && filters.sort !== "newest"),
  ].filter(Boolean).length;

  const getProductName = (id: string) =>
    products.find((p) => p._id === id)?.name || "Product";
  const getCategoryName = (id: string) =>
    categories.find((c) => c._id === id)?.name || "Category";
  const getCreatorName = (id: string) =>
    creators.find((c) => c._id === id)?.name || "Staff";

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
            <h3 className="font-bold text-sm tracking-tight">Filter Credit Records</h3>
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

        {/* Universal Search */}
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="text"
            placeholder="Search customer name, phone, city, address, product, note, receipt ID, staff..."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Status */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertCircle size={11} /> Status
            </span>
            <select
              className={inputClass}
              value={filters.status}
              onChange={(e) =>
                onFilterChange({ ...filters, status: e.target.value })
              }
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open (Pending)</option>
              <option value="Paid">Paid (Settled)</option>
              <option value="Reverted">Reverted (Cancelled)</option>
            </select>
          </label>

          {/* Balance Debt Filter */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Wallet size={11} /> Debt Balance
            </span>
            <select
              className={inputClass}
              value={filters.balanceStatus}
              onChange={(e) =>
                onFilterChange({ ...filters, balanceStatus: e.target.value })
              }
            >
              <option value="all">All Records</option>
              <option value="pending">Remaining Debt (&gt; 0)</option>
              <option value="settled">Fully Settled (= 0)</option>
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

          {/* Created By / Staff */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <User size={11} /> Recorded By
            </span>
            <select
              className={inputClass}
              value={filters.createdBy}
              onChange={(e) =>
                onFilterChange({ ...filters, createdBy: e.target.value })
              }
            >
              <option value="all">All Staff</option>
              {creators.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.role || "staff"})
                </option>
              ))}
            </select>
          </label>

          {/* Date Period */}
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
              <option value="remaining_desc">Debt: High to Low</option>
              <option value="total_desc">Total: High to Low</option>
            </select>
          </label>
        </div>

        {/* Custom Date Pickers */}
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

            {filters.status && filters.status !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Status: {filters.status}
                <button
                  onClick={() => onFilterChange({ ...filters, status: "all" })}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.balanceStatus && filters.balanceStatus !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Debt: {filters.balanceStatus === "pending" ? "Remaining Debt" : "Fully Settled"}
                <button
                  onClick={() => onFilterChange({ ...filters, balanceStatus: "all" })}
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

            {filters.createdBy && filters.createdBy !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                Staff: {getCreatorName(filters.createdBy)}
                <button
                  onClick={() => onFilterChange({ ...filters, createdBy: "all" })}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <CreditCard size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
              Records Found
            </span>
            <span className="text-base sm:text-lg font-black text-foreground truncate block">
              {totalRecords.toLocaleString()} {totalRecords === 1 ? "Record" : "Records"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
            <DollarSign size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
              Total Credit Volume
            </span>
            <span className="text-base sm:text-lg font-black text-blue-600 truncate block">
              {currency} {Number(totalAmountSum || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
              Total Paid
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 truncate block">
              {currency} {Number(totalPaidSum || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
            <Wallet size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
              Remaining Debt
            </span>
            <span className="text-base sm:text-lg font-black text-amber-600 truncate block">
              {currency} {Number(totalRemainingSum || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditSaleFilterBar;
