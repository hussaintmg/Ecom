"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Grid,
  RefreshCw,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Inbox,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface ProductInventoryItem {
  _id: string;
  name: string;
  images?: { url: string }[];
  category?: { _id: string; name: string };
  price: number;
  barcode?: string;
  stock: number; // Good / Sellable
  pendingStock: number;
  defectiveStock: number;
  repairingStock: number;
  totalPhysicalActiveStock: number;
}

const STOCK_STATE_FILTERS = [
  { label: "All Products", value: "All" },
  { label: "Sellable > 0", value: "InStock" },
  { label: "Pending Inspection > 0", value: "Pending" },
  { label: "Defective > 0", value: "Defective" },
  { label: "In Repair > 0", value: "Repairing" },
  { label: "Out of Sellable Stock", value: "OutOfStock" },
];

export const InventoryOverviewContent = ({ basePath = "/admin" }: { basePath?: string }) => {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [localCategory, setLocalCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [products, setProducts] = useState<ProductInventoryItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Overall totals
  const [totals, setTotals] = useState({
    totalSellable: 0,
    totalPending: 0,
    totalDefective: 0,
    totalRepairing: 0,
    totalPhysical: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageInput, setPageInput] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearch);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCats();
  }, []);

  // Fetch overview from centralized API
  const fetchOverview = useCallback(
    async (pageToFetch: number, showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", pageToFetch.toString());
        params.append("limit", "10");
        if (debouncedSearch) params.append("search", debouncedSearch);
        if (localCategory && localCategory !== "All") params.append("category", localCategory);
        if (stockFilter && stockFilter !== "All") params.append("stockFilter", stockFilter);

        const res = await fetch(`/api/inventory?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setProducts(data.products || []);
          setTotalPages(data.totalPages || 1);
          setTotalProducts(data.totalProducts || 0);
          setTotals({
            totalSellable: data.totalSellable || 0,
            totalPending: data.totalPending || 0,
            totalDefective: data.totalDefective || 0,
            totalRepairing: data.totalRepairing || 0,
            totalPhysical: data.totalPhysical || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching inventory overview:", err);
      } finally {
        if (showLoading) setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, localCategory, stockFilter]
  );

  useEffect(() => {
    fetchOverview(currentPage);
  }, [currentPage, fetchOverview]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOverview(currentPage, false);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const startProduct = (currentPage - 1) * 10 + 1;
  const endProduct = Math.min(currentPage * 10, totalProducts);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl shadow-sm">
            <Grid size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Main Inventory Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comprehensive physical stock tracking: Sellable, Pending Inspection, Defective, and In Repair
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="gap-2"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>

          <Link href={`${basePath}/inventory/receiving`}>
            <Button size="sm" variant="outline" className="gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
              <Inbox size={14} /> Stock Receiving
            </Button>
          </Link>

          <Link href={`${basePath}/inventory/defective`}>
            <Button size="sm" variant="outline" className="gap-2 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10">
              <AlertTriangle size={14} /> Defective Stock
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Summary Cards (All Stock States Separated) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Good / Sellable */}
        <div className="p-4 rounded-2xl border bg-card shadow-sm border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Good / Sellable
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : totals.totalSellable.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Available on storefront</p>
          </div>
        </div>

        {/* Pending Inspection */}
        <div className="p-4 rounded-2xl border bg-card shadow-sm border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Inbox size={13} /> Pending Inspection
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {loading ? "..." : totals.totalPending.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting QA verification</p>
          </div>
        </div>

        {/* Defective Stock */}
        <div className="p-4 rounded-2xl border bg-card shadow-sm border-red-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={13} /> Defective
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-red-600 dark:text-red-400">
              {loading ? "..." : totals.totalDefective.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting repair / decision</p>
          </div>
        </div>

        {/* In Repair */}
        <div className="p-4 rounded-2xl border bg-card shadow-sm border-sky-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Wrench size={13} /> In Repair
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {loading ? "..." : totals.totalRepairing.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Technician in progress</p>
          </div>
        </div>

        {/* Total Physical Active Stock */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl border bg-primary/5 shadow-sm border-primary/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Package size={13} /> Total Physical
            </span>
            <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              Active On-Hand
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground">
              {loading ? "..." : totals.totalPhysical.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Good + Pending + Def + Rep</p>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col gap-5">
        {/* Search, Category, and State Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="Search by product name, SKU, barcode..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <select
            value={localCategory}
            onChange={(e) => {
              setLocalCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer min-w-[170px]"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock State Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap border-y py-3">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1">
            <SlidersHorizontal size={13} /> Stock State:
          </span>
          {STOCK_STATE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStockFilter(f.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                stockFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Products List / Table */}
        {loading && products.length === 0 ? (
          <div className="flex flex-col gap-3 py-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm border rounded-2xl border-dashed">
            <Package size={36} className="mx-auto opacity-30 mb-2" />
            No products found matching this filter.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5 text-center">Good / Sellable</th>
                    <th className="px-4 py-3.5 text-center">Pending Inspection</th>
                    <th className="px-4 py-3.5 text-center">Defective</th>
                    <th className="px-4 py-3.5 text-center">In Repair</th>
                    <th className="px-4 py-3.5 text-center">Total Physical</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => {
                    const isSellableOut = p.stock === 0;
                    return (
                      <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                              {p.images?.[0]?.url ? (
                                <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={18} className="text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate max-w-[220px]">
                                {p.name}
                              </h4>
                              {p.barcode && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  SKU: {p.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {p.category?.name || "Uncategorized"}
                        </td>
                        {/* Good / Sellable */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                              isSellableOut
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {p.stock}
                          </span>
                        </td>
                        {/* Pending Inspection */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                              p.pendingStock > 0
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground opacity-40"
                            }`}
                          >
                            {p.pendingStock}
                          </span>
                        </td>
                        {/* Defective */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                              p.defectiveStock > 0
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "text-muted-foreground opacity-40"
                            }`}
                          >
                            {p.defectiveStock}
                          </span>
                        </td>
                        {/* In Repair */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                              p.repairingStock > 0
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                : "text-muted-foreground opacity-40"
                            }`}
                          >
                            {p.repairingStock}
                          </span>
                        </td>
                        {/* Total Physical */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                            {p.totalPhysicalActiveStock}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="lg:hidden flex flex-col gap-3">
              {products.map((p) => (
                <div
                  key={p._id}
                  className="border rounded-2xl bg-card p-4 flex flex-col gap-3 shadow-xs hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{p.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.category?.name || "Uncategorized"}
                          {p.barcode && ` • ${p.barcode}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Total Physical
                      </span>
                      <span className="text-base font-black text-primary">
                        {p.totalPhysicalActiveStock}
                      </span>
                    </div>
                  </div>

                  {/* Stock Breakdown Grid */}
                  <div className="grid grid-cols-4 gap-1.5 bg-muted/40 p-2.5 rounded-xl text-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Sellable
                      </span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {p.stock}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Pending
                      </span>
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                        {p.pendingStock}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                        Defective
                      </span>
                      <span className="text-sm font-black text-red-600 dark:text-red-400 mt-0.5">
                        {p.defectiveStock}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                        Repair
                      </span>
                      <span className="text-sm font-black text-sky-600 dark:text-sky-400 mt-0.5">
                        {p.repairingStock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Showing {startProduct}-{endProduct} of {totalProducts} products
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="gap-1 h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft size={13} /> Prev
                  </Button>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span>Page</span>
                    <input
                      type="number"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && goToPage(parseInt(pageInput))}
                      placeholder={currentPage.toString()}
                      className="w-12 h-8 px-1 text-center border rounded-lg bg-background text-xs"
                      min={1}
                      max={totalPages}
                    />
                    <span>of {totalPages}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="gap-1 h-8 px-2.5 text-xs"
                  >
                    Next <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const AdminInventoryPage = () => {
  return <InventoryOverviewContent basePath="/admin" />;
};

export default AdminInventoryPage;