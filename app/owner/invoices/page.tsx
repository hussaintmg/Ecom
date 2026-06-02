// app/owner/invoices/page.tsx

"use client";
import React, { useEffect, useState, useCallback } from "react";
import { InvoiceProvider, useInvoices } from "@/context/InvoiceContext";
import { ProductProvider, useProducts } from "@/context/ProductContext";
import { CategoryProvider, useCategories } from "@/context/CategoryContext";
import Button from "@/components/ui/Button";
import {
  RefreshCw,
  ReceiptText,
  Filter,
  CalendarDays,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
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
  const [pageInput, setPageInput] = useState("");
  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  // Load initial data
  useEffect(() => {
    fetchProducts(1, "", "All");
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // Fetch invoices when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
      fetchInvoices(currentPage, localSearch, {
        product: filterProduct,
        category: filterCategory,
        startDate: filterStart,
        endDate: filterEnd,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    currentPage,
    localSearch,
    filterProduct,
    filterCategory,
    filterStart,
    filterEnd,
  ]);

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
      // Make sure invoice has product with images
      const invoiceWithImage = {
        ...inv,
        product: {
          ...inv.product,
          images: inv.product?.images || [], // Ensure images array exists
        },
      };
      await downloadInvoicePDF(invoiceWithImage);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const page = parseInt(pageInput);
      if (!isNaN(page)) {
        goToPage(page);
      }
    }
  };

  const startItem = (currentPage - 1) * 10 + 1;
  const endItem = Math.min(currentPage * 10, totalInvoices);

  const inputClass =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <ReceiptText size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Sales Invoices
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalInvoices > 0
                ? `Showing ${totalInvoices} invoices`
                : "No invoices found"}
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

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            <Filter size={14} /> Filter Invoices
          </h3>
          {(filterProduct ||
            filterCategory ||
            filterStart ||
            filterEnd ||
            localSearch) && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-red-500 hover:underline"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Search Product
            </span>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
              />
              <input
                type="text"
                placeholder="Product name..."
                className={`${inputClass} pl-8`}
                value={localSearch}
                onChange={handleSearchChange}
              />
            </div>
          </label>

          {/* Product Filter */}
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

          {/* Category Filter */}
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

          {/* Start Date */}
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

          {/* End Date */}
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

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground gap-3 border rounded-2xl bg-card">
          <ReceiptText size={40} className="opacity-30" />
          <p className="text-sm font-medium">
            No invoices found matching criteria.
          </p>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 bg-primary/5">Qty</th>
                  <th className="px-5 py-3 bg-primary/5">Total Price</th>
                  <th className="px-5 py-3">Memo</th>
                  <th className="px-5 py-3 text-right">Sold By</th>
                  <th className="px-5 py-3 text-center">Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv, idx) => (
                  <tr
                    key={inv._id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {(currentPage - 1) * 10 + idx + 1}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {inv.product?.name || "Deleted Product"}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {inv.category?.name || "No Category"}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-center bg-primary/5">
                      {inv.quantity}
                    </td>
                    <td className="px-5 py-4 font-black bg-primary/5 text-emerald-600">
                      PKR {inv.salePrice.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground truncate max-w-50">
                      {inv.description || "-"}
                    </td>
                    <td className="px-5 py-4 text-xs text-right whitespace-nowrap">
                      {inv.soldBy?.name || "Unknown"}
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {inv.soldBy?.role || "Staff"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleDownload(inv)}
                        disabled={downloadingId === inv._id}
                        className="p-1.5 rounded-lg border hover:bg-primary/10 transition-colors text-primary"
                        title="Download Bill"
                      >
                        {downloadingId === inv._id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {invoices.map((inv) => (
              <div
                key={inv._id}
                className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base">
                      {inv.product?.name || "Deleted Product"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {inv.category?.name || "Unknown Category"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600 text-base">
                      PKR {inv.salePrice.toLocaleString()}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground bg-muted inline-block px-1.5 py-0.5 rounded">
                      Qty: {inv.quantity}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-foreground bg-muted/40 p-2 rounded-lg border">
                  {inv.description || "No description"}
                </div>
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
                      className="p-1.5 rounded-lg border hover:bg-primary/10 transition-colors text-primary"
                    >
                      {downloadingId === inv._id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Go to page</span>
                  <input
                    type="number"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={handlePageInputKeyDown}
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
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const InvoicesPage = () => {
  return (
    <ProductProvider>
      <CategoryProvider>
        <InvoiceProvider>
          <InvoicesInner />
        </InvoiceProvider>
      </CategoryProvider>
    </ProductProvider>
  );
};

export default InvoicesPage;
