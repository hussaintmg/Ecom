// app/owner/invoices/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { InvoiceProvider, useInvoices } from "@/context/InvoiceContext";
import { ProductProvider, useProducts } from "@/context/ProductContext";
import { CategoryProvider, useCategories } from "@/context/CategoryContext";
import Button from "@/components/ui/Button";
import TooltipCell from "@/components/ui/TooltipCell";
import { CustomerCell, CustomerDetailsModal } from "@/components/dashboard/InvoiceCustomer";
import {
  RefreshCw,
  ReceiptText,
  Filter,
  CalendarDays,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building2,
  StickyNote,
} from "lucide-react";
import { downloadInvoicePDF } from "@/utils/downloadInvoicePDF";

const Skeleton = () => (
  <div className="animate-pulse flex flex-col gap-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-24 rounded-xl bg-muted/60" />
    ))}
  </div>
);

const InvoicesInner = () => {
  const {
    invoices,
    totalInvoices,
    currentPage,
    totalPages,
    loading,
    fetchInvoices,
    deleteInvoice,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
  } = useInvoices();
  const { products, fetchProducts } = useProducts();
  const { categories, fetchCategories } = useCategories();

  const [filterProduct, setFilterProduct] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("");
  // Invoice whose full customer record is open in the details sheet
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery || "");
  const [prevSearch, setPrevSearch] = useState(searchQuery || "");
  const [prevFilters, setPrevFilters] = useState({
    filterProduct,
    filterCategory,
    filterStart,
    filterEnd,
  });

  useEffect(() => {
    fetchProducts(1, "", "All");
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const searchChanged = localSearch !== prevSearch;
      const filtersChanged =
        filterProduct !== prevFilters.filterProduct ||
        filterCategory !== prevFilters.filterCategory ||
        filterStart !== prevFilters.filterStart ||
        filterEnd !== prevFilters.filterEnd;

      if (searchChanged || filtersChanged) {
        setPrevSearch(localSearch);
        setPrevFilters({ filterProduct, filterCategory, filterStart, filterEnd });
        fetchInvoices(1, localSearch, {
          product: filterProduct,
          category: filterCategory,
          startDate: filterStart,
          endDate: filterEnd,
        });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [localSearch, filterProduct, filterCategory, filterStart, filterEnd, fetchInvoices]);

  useEffect(() => {
    fetchInvoices(currentPage, prevSearch, {
      product: filterProduct,
      category: filterCategory,
      startDate: filterStart,
      endDate: filterEnd,
    });
  }, [currentPage, fetchInvoices]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchInvoices(1, localSearch, {
      product: filterProduct,
      category: filterCategory,
      startDate: filterStart,
      endDate: filterEnd,
    });
  };

  const clearFilters = () => {
    setFilterProduct("");
    setFilterCategory("");
    setFilterStart("");
    setFilterEnd("");
    setLocalSearch("");
    setSearchQuery("");
    setCurrentPage(1);
    fetchInvoices(1, "", {});
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices(currentPage, localSearch, {
      product: filterProduct,
      category: filterCategory,
      startDate: filterStart,
      endDate: filterEnd,
    });
    setRefreshing(false);
  };

  const handleDownload = async (inv: any) => {
    setDownloadingId(inv._id);
    try {
      await downloadInvoicePDF(inv);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (inv: any) => {
    const restoresStock = (inv.type || "Sell") === "Sell";
    const ok = confirm(
      restoresStock
        ? "Delete this Sell invoice and restore product stock?"
        : "Delete this Repair invoice? Stock will not be changed."
    );
    if (!ok) return;

    setDeletingId(inv._id);
    await deleteInvoice(inv._id);
    setDeletingId(null);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const inputClass =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors";

  // Helper: build per-invoice tooltip data
  const getInvData = (inv: any) => {
    const productNames: string[] = (inv.products ?? []).map(
      (p: any) => p.product?.name || "Deleted Product"
    );
    const categoryNames: string[] = (inv.products ?? []).map(
      (p: any) =>
        p.category?.name ||
        categories.find((c: any) => c._id === (p.category?._id || p.category))
          ?.name ||
        "Uncategorized"
    );
    const descriptions: string[] = (inv.products ?? [])
      .map((p: any) => p.description)
      .filter(Boolean);
    const totalQty = (inv.products ?? []).reduce(
      (s: number, p: any) => s + (p.quantity ?? 0),
      0
    );
    const totalPrice = (inv.products ?? []).reduce(
      (s: number, p: any) => s + (p.salePrice ?? 0) * (p.quantity ?? 1),
      0
    );
    return { productNames, categoryNames, descriptions, totalQty, totalPrice };
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <ReceiptText size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Sales Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalInvoices > 0 ? `Showing ${totalInvoices} invoices` : "No invoices found"}
            </p>
          </div>
        </div>
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
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <Filter size={14} /> Filter Invoices
          </h3>
          {(filterProduct || filterCategory || filterStart || filterEnd || localSearch) && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-red-500 hover:underline"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Search Customer / Product
            </span>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <input
                type="text"
                placeholder="Name, phone, city or product..."
                className={`${inputClass} pl-8`}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Product
            </span>
            <select
              className={inputClass}
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Category
            </span>
            <select
              className={inputClass}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
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
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
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
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleApplyFilters} className="gap-2">
            <Search size={14} /> Apply Filters
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <Skeleton />
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground gap-3 border rounded-2xl bg-card">
          <ReceiptText size={40} className="opacity-30" />
          <p className="text-sm font-medium">No invoices found matching criteria.</p>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block rounded-2xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 min-w-[210px]">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 bg-primary/5 text-center">Qty</th>
                  <th className="px-4 py-3 bg-primary/5 whitespace-nowrap">Total Price</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Sold By</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv, idx) => {
                  const {
                    productNames,
                    categoryNames,
                    descriptions,
                    totalQty,
                    totalPrice,
                  } = getInvData(inv);
                  return (
                    <tr
                      key={inv._id}
                      className="group hover:bg-primary/[0.04] hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)] transition-colors"
                    >
                      <td className="px-4 py-4 text-xs text-muted-foreground border-l-2 border-transparent group-hover:border-primary transition-colors">
                        {(currentPage - 1) * 10 + idx + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-4">
                        <CustomerCell
                          invoice={inv}
                          onOpen={() => setDetailInvoice(inv)}
                          secondary="hint"
                        />
                      </td>

                      {/* Contact — phone / city / address at a glance */}
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-1 max-w-[190px]">
                          {inv.customerPhone ? (
                            <a
                              href={`tel:${inv.customerPhone.replace(/[^\d+]/g, "")}`}
                              className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors w-fit"
                            >
                              <Phone size={11} className="shrink-0" />
                              {inv.customerPhone}
                            </a>
                          ) : (
                            <span className="italic opacity-60">No phone</span>
                          )}
                          {inv.customerCity && (
                            <span className="flex items-center gap-1.5">
                              <Building2 size={11} className="shrink-0" />
                              {inv.customerCity}
                            </span>
                          )}
                          {inv.customerAddress && (
                            <span className="flex items-start gap-1.5">
                              <MapPin size={11} className="shrink-0 mt-0.5" />
                              <TooltipCell
                                display={inv.customerAddress}
                                tooltipLines={[inv.customerAddress]}
                                maxChars={22}
                              />
                            </span>
                          )}
                          {inv.customerEmail && (
                            <a
                              href={`mailto:${inv.customerEmail}`}
                              className="flex items-center gap-1.5 hover:text-primary transition-colors w-fit"
                            >
                              <Mail size={11} className="shrink-0" />
                              <TooltipCell
                                display={inv.customerEmail}
                                tooltipLines={[inv.customerEmail]}
                                maxChars={22}
                              />
                            </a>
                          )}
                          {inv.customerNote && (
                            <span className="flex items-start gap-1.5">
                              <StickyNote size={11} className="shrink-0 mt-0.5" />
                              <TooltipCell
                                display={inv.customerNote}
                                tooltipLines={[inv.customerNote]}
                                maxChars={22}
                              />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product — portal tooltip */}
                      <td className="px-4 py-4 font-semibold text-foreground">
                        <TooltipCell
                          display={productNames.join(", ") || "-"}
                          tooltipLines={productNames}
                          maxChars={32}
                        />
                      </td>

                      {/* Category — portal tooltip */}
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <TooltipCell
                          display={categoryNames.join(", ") || "-"}
                          tooltipLines={categoryNames}
                          maxChars={28}
                        />
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                          inv.type === "Repair"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}>
                          {inv.type || "Sell"}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-bold text-center bg-primary/5">
                        {totalQty}
                      </td>
                      <td className="px-4 py-4 font-black bg-primary/5 text-emerald-600 whitespace-nowrap">
                        PKR {totalPrice.toLocaleString()}
                      </td>

                      {/* Description — portal tooltip */}
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <TooltipCell
                          display={descriptions.join(" | ") || "-"}
                          tooltipLines={descriptions.length ? descriptions : ["-"]}
                          maxChars={36}
                        />
                      </td>

                      <td className="px-4 py-4 text-xs text-right whitespace-nowrap">
                        {inv.soldBy?.name || "Unknown"}
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {inv.soldBy?.role || "Staff"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleDownload(inv)}
                            disabled={downloadingId === inv._id}
                            className="p-1.5 rounded-lg border hover:bg-primary/10 transition-colors text-primary disabled:opacity-50"
                            title="Download Bill"
                          >
                            {downloadingId === inv._id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(inv)}
                            disabled={deletingId === inv._id}
                            className="p-1.5 rounded-lg border hover:bg-red-500/10 transition-colors text-red-600 disabled:opacity-50"
                            title="Delete Invoice"
                          >
                            {deletingId === inv._id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {invoices.map((inv) => {
              const { productNames, categoryNames, descriptions, totalQty, totalPrice } =
                getInvData(inv);
              return (
                <div
                  key={inv._id}
                  className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col gap-3 transition-colors hover:border-primary/30"
                >
                  {/* Customer — tap for the full record */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b">
                    <CustomerCell invoice={inv} onOpen={() => setDetailInvoice(inv)} />
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      inv.type === "Repair"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      {inv.type || "Sell"}
                    </span>
                  </div>

                  {/* Contact chips */}
                  {(inv.customerPhone ||
                    inv.customerCity ||
                    inv.customerAddress ||
                    inv.customerEmail ||
                    inv.customerNote) && (
                    <div className="flex flex-wrap gap-1.5 -mt-0.5">
                      {inv.customerPhone && (
                        <a
                          href={`tel:${inv.customerPhone.replace(/[^\d+]/g, "")}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full active:scale-95 transition-transform"
                        >
                          <Phone size={10} /> {inv.customerPhone}
                        </a>
                      )}
                      {inv.customerCity && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-1 rounded-full text-muted-foreground">
                          <Building2 size={10} /> {inv.customerCity}
                        </span>
                      )}
                      {inv.customerEmail && (
                        <a
                          href={`mailto:${inv.customerEmail}`}
                          className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-1 rounded-full text-muted-foreground max-w-full truncate"
                        >
                          <Mail size={10} /> {inv.customerEmail}
                        </a>
                      )}
                      {inv.customerAddress && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-1 rounded-full text-muted-foreground max-w-full truncate">
                          <MapPin size={10} /> {inv.customerAddress}
                        </span>
                      )}
                      {inv.customerNote && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-1 rounded-full text-muted-foreground max-w-full truncate">
                          <StickyNote size={10} /> {inv.customerNote}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Products */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground">
                        <TooltipCell
                          display={productNames.join(", ") || "-"}
                          tooltipLines={productNames}
                          maxChars={30}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <TooltipCell
                          display={categoryNames.join(", ") || "Unknown Category"}
                          tooltipLines={categoryNames}
                          maxChars={28}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-emerald-600 text-base">
                        PKR {totalPrice.toLocaleString()}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground bg-muted inline-block px-1.5 py-0.5 rounded">
                        Qty: {totalQty}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-foreground bg-muted/40 p-2 rounded-lg border">
                    <TooltipCell
                      display={descriptions.join(" | ") || "No description"}
                      tooltipLines={descriptions.length ? descriptions : ["No description"]}
                      maxChars={55}
                    />
                  </div>

                  {/* Bottom */}
                  <div className="flex justify-between items-center border-t pt-2 mt-1">
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        By {inv.soldBy?.name || "Unknown"}
                      </div>
                      <button
                        onClick={() => handleDownload(inv)}
                        disabled={downloadingId === inv._id}
                        className="p-1.5 rounded-lg border hover:bg-primary/10 transition-colors text-primary disabled:opacity-50"
                      >
                        {downloadingId === inv._id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(inv)}
                        disabled={deletingId === inv._id}
                        className="p-1.5 rounded-lg border hover:bg-red-500/10 transition-colors text-red-600 disabled:opacity-50"
                        title="Delete Invoice"
                      >
                        {deletingId === inv._id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft size={14} /> Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Go to page</span>
                  <input
                    type="number"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goToPage(parseInt(pageInput));
                    }}
                    className="w-16 px-2 py-1 text-sm text-center border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
                    min={1}
                    max={totalPages}
                    placeholder={currentPage.toString()}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goToPage(parseInt(pageInput))}
                    disabled={!pageInput}
                  >
                    Go
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Customer details sheet ── */}
      <CustomerDetailsModal
        open={!!detailInvoice}
        onClose={() => setDetailInvoice(null)}
        invoice={detailInvoice}
        currency="PKR"
      />
    </div>
  );
};

const InvoicesPage = () => (
  <ProductProvider>
    <CategoryProvider>
      <InvoiceProvider>
        <InvoicesInner />
      </InvoiceProvider>
    </CategoryProvider>
  </ProductProvider>
);

export default InvoicesPage;
