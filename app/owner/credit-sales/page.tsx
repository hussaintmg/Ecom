"use client";

import React, { useEffect, useState } from "react";
import { CreditSaleProvider, useCreditSales } from "@/context/CreditSaleContext";
import { ProductProvider, useProducts } from "@/context/ProductContext";
import { CategoryProvider, useCategories } from "@/context/CategoryContext";
import Button from "@/components/ui/Button";
import TooltipCell from "@/components/ui/TooltipCell";
import { CustomerCell, CustomerDetailsModal } from "@/components/dashboard/InvoiceCustomer";
import CreditSaleFilterBar, { CreditSaleFilterState } from "@/components/dashboard/CreditSaleFilterBar";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  RotateCcw,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react";
import { downloadInvoicePDF } from "@/utils/downloadInvoicePDF";

const Skeleton = () => (
  <div className="animate-pulse flex flex-col gap-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-24 rounded-xl bg-muted/60" />
    ))}
  </div>
);

const initialFilters: CreditSaleFilterState = {
  search: "",
  status: "all",
  balanceStatus: "all",
  product: "all",
  category: "all",
  createdBy: "all",
  startDate: "",
  endDate: "",
  datePreset: "all",
  sort: "newest",
};

const CreditSalesInner = () => {
  const {
    creditSales,
    totalCreditSales,
    totalAmountSum,
    totalRemainingSum,
    totalPaidSum,
    creators,
    currentPage,
    totalPages,
    loading,
    fetchCreditSales,
    addCreditPayment,
    revertCreditSale,
    deleteCreditSale,
    setCurrentPage,
  } = useCreditSales();
  const { products, fetchProducts } = useProducts();
  const { categories, fetchCategories } = useCategories();

  const [filters, setFilters] = useState<CreditSaleFilterState>(initialFilters);
  // Credit sale whose full customer record is open in the details sheet
  const [detailCredit, setDetailCredit] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    fetchProducts(1, "", "All");
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCreditSales(1, filters.search, {
        product: filters.product === "all" ? "" : filters.product,
        category: filters.category === "all" ? "" : filters.category,
        status: filters.status === "all" ? "" : filters.status,
        createdBy: filters.createdBy === "all" ? "" : filters.createdBy,
        balanceStatus: filters.balanceStatus === "all" ? "" : filters.balanceStatus,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sort: filters.sort,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [filters, fetchCreditSales]);

  const handleReset = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
    fetchCreditSales(1, "", {});
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCreditSales(currentPage, filters.search, {
      product: filters.product === "all" ? "" : filters.product,
      category: filters.category === "all" ? "" : filters.category,
      status: filters.status === "all" ? "" : filters.status,
      createdBy: filters.createdBy === "all" ? "" : filters.createdBy,
      balanceStatus: filters.balanceStatus === "all" ? "" : filters.balanceStatus,
      startDate: filters.startDate,
      endDate: filters.endDate,
      sort: filters.sort,
    });
    setRefreshing(false);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchCreditSales(page, filters.search, {
        product: filters.product === "all" ? "" : filters.product,
        category: filters.category === "all" ? "" : filters.category,
        status: filters.status === "all" ? "" : filters.status,
        createdBy: filters.createdBy === "all" ? "" : filters.createdBy,
        balanceStatus: filters.balanceStatus === "all" ? "" : filters.balanceStatus,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sort: filters.sort,
      });
      setPageInput("");
    }
  };

  const getCreditData = (credit: any) => {
    const productNames: string[] = (credit.products ?? []).map(
      (p: any) => p.product?.name || "Deleted Product"
    );
    const categoryNames: string[] = (credit.products ?? []).map(
      (p: any) =>
        p.category?.name ||
        categories.find((c: any) => c._id === (p.category?._id || p.category))
          ?.name ||
        "Uncategorized"
    );
    const descriptions: string[] = (credit.products ?? [])
      .map((p: any) => p.description)
      .filter(Boolean);
    const totalQty = (credit.products ?? []).reduce(
      (s: number, p: any) => s + (p.quantity ?? 0),
      0
    );
    const totalPrice =
      credit.totalAmount ??
      (credit.products ?? []).reduce((s: number, p: any) => s + (p.salePrice ?? 0), 0);
    const paidAmount = credit.paidAmount ?? 0;
    const remainingAmount = credit.remainingAmount ?? Math.max(totalPrice - paidAmount, 0);
    const paymentLines: string[] = (credit.payments ?? []).map((payment: any) => {
      const date = payment.receivedAt
        ? new Date(payment.receivedAt).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "-";
      return `PKR ${Number(payment.amount || 0).toLocaleString()} received on ${date}. Remaining: PKR ${Number(payment.remainingAmount || 0).toLocaleString()}`;
    });
    return {
      productNames,
      categoryNames,
      descriptions,
      totalQty,
      totalPrice,
      paidAmount,
      remainingAmount,
      paymentLines,
    };
  };

  const handleDownload = async (credit: any) => {
    setDownloadingId(credit._id);
    try {
      await downloadInvoicePDF({
        ...credit,
        invoiceNo: `CR-${credit._id?.slice(-8) || "00000000"}`,
        type: "Credit",
        soldBy: credit.createdBy,
      });
    } catch (err) {
      console.error("Download credit receipt error:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAddPayment = async (credit: any) => {
    const remaining = credit.remainingAmount ?? credit.totalAmount ?? 0;
    const rawAmount = window.prompt(
      `Enter received amount. Remaining balance is PKR ${Number(remaining).toLocaleString()}.`
    );
    if (!rawAmount) return;

    const amount = Number(rawAmount);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }

    setActioningId(credit._id);
    await addCreditPayment(credit._id, amount);
    setActioningId(null);
  };

  const handleRevert = async (credit: any) => {
    if (!confirm("Revert this credit sale and restore product stock?")) return;
    setActioningId(credit._id);
    await revertCreditSale(credit._id);
    setActioningId(null);
  };

  const handleDelete = async (credit: any) => {
    if (!confirm("Delete this credit sale and restore product stock?")) return;
    setActioningId(credit._id);
    await deleteCreditSale(credit._id);
    setActioningId(null);
  };

  const getRowClass = (credit: any) => {
    if (credit.status === "Reverted") {
      return "bg-red-500/5 text-muted-foreground hover:bg-red-500/10";
    }
    if (credit.status === "Paid") {
      return "bg-emerald-500/5 text-muted-foreground hover:bg-emerald-500/10";
    }
    return "hover:bg-muted/20";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Credit Records</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCreditSales > 0
                ? `Showing ${totalCreditSales} credit records`
                : "No credit records found"}
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

      {/* ── Filter Bar Component ── */}
      <CreditSaleFilterBar
        filters={filters}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        onReset={handleReset}
        products={products}
        categories={categories}
        creators={creators}
        totalRecords={totalCreditSales}
        totalAmountSum={totalAmountSum}
        totalRemainingSum={totalRemainingSum}
        totalPaidSum={totalPaidSum}
        currency="PKR"
        loading={loading}
      />

      {loading ? (
        <Skeleton />
      ) : creditSales.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground gap-3 border rounded-2xl bg-card">
          <CreditCard size={40} className="opacity-30" />
          <p className="text-sm font-medium">No credit records found matching criteria.</p>
          <Button size="sm" variant="outline" onClick={handleReset}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-2xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 bg-primary/5 text-center">Qty</th>
                  <th className="px-4 py-3 bg-primary/5 whitespace-nowrap">Total Price</th>
                  <th className="px-4 py-3 whitespace-nowrap">Paid</th>
                  <th className="px-4 py-3 whitespace-nowrap">Remaining</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Saved By</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {creditSales.map((credit, idx) => {
                  const {
                    productNames,
                    categoryNames,
                    descriptions,
                    totalQty,
                    totalPrice,
                    paidAmount,
                    remainingAmount,
                    paymentLines,
                  } = getCreditData(credit);
                  
                  const isCancelledOrPaid = credit.status === "Paid" || credit.status === "Reverted";

                  return (
                    <tr key={credit._id} className={`${getRowClass(credit)} transition-colors`}>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {(currentPage - 1) * 10 + idx + 1}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-xs text-muted-foreground ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        {new Date(credit.createdAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className={`px-4 py-4 ${isCancelledOrPaid ? "opacity-60" : ""}`}>
                        <CustomerCell
                          invoice={credit}
                          onOpen={() =>
                            setDetailCredit({
                              ...credit,
                              type: "Credit",
                              soldBy: credit.createdBy,
                            })
                          }
                        />
                      </td>
                      <td className={`px-4 py-4 font-semibold text-foreground ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        <TooltipCell
                          display={productNames.join(", ") || "-"}
                          tooltipLines={productNames}
                          maxChars={32}
                        />
                      </td>
                      <td className={`px-4 py-4 text-xs text-muted-foreground ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        <TooltipCell
                          display={categoryNames.join(", ") || "-"}
                          tooltipLines={categoryNames}
                          maxChars={28}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap border ${
                          credit.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : credit.status === "Reverted"
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : "bg-sky-500/10 text-sky-600 border-sky-500/20"
                        }`}>
                          {credit.status || "Open"}
                        </span>
                      </td>
                      <td className={`px-4 py-4 font-bold text-center bg-primary/5 ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        {totalQty}
                      </td>
                      <td className={`px-4 py-4 font-black bg-primary/5 text-emerald-600 whitespace-nowrap ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        PKR {totalPrice.toLocaleString()}
                      </td>
                      <td className={`px-4 py-4 text-xs font-bold text-emerald-600 whitespace-nowrap ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        <TooltipCell
                          display={`PKR ${Number(paidAmount).toLocaleString()}`}
                          tooltipLines={paymentLines.length ? paymentLines : ["No payments received yet"]}
                          maxChars={24}
                        />
                      </td>
                      <td className={`px-4 py-4 text-xs font-bold text-red-500 whitespace-nowrap ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        PKR {Number(remainingAmount).toLocaleString()}
                      </td>
                      <td className={`px-4 py-4 text-xs text-muted-foreground ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        <TooltipCell
                          display={descriptions.join(" | ") || "-"}
                          tooltipLines={descriptions.length ? descriptions : ["-"]}
                          maxChars={36}
                        />
                      </td>
                      <td className="px-4 py-4 text-xs text-right whitespace-nowrap">
                        {credit.createdBy?.name || "Unknown"}
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {credit.createdBy?.role || "Staff"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAddPayment(credit)}
                            disabled={actioningId === credit._id || credit.status !== "Open"}
                            className="p-1.5 rounded-lg border hover:bg-emerald-500/10 transition-colors text-emerald-600 disabled:opacity-40"
                            title="Add Balance"
                          >
                            <Wallet size={14} />
                          </button>
                          <button
                            onClick={() => handleRevert(credit)}
                            disabled={actioningId === credit._id || credit.status === "Reverted"}
                            className="p-1.5 rounded-lg border hover:bg-amber-500/10 transition-colors text-amber-600 disabled:opacity-40"
                            title="Revert and Restore Stock"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(credit)}
                            disabled={actioningId === credit._id}
                            className="p-1.5 rounded-lg border hover:bg-red-500/10 transition-colors text-red-600 disabled:opacity-40"
                            title="Delete and Restore Stock"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(credit)}
                            disabled={downloadingId === credit._id}
                            className="p-1.5 rounded-lg border hover:bg-primary/10 transition-colors text-primary disabled:opacity-50"
                            title="Download Receipt"
                          >
                            {downloadingId === credit._id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
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

          <div className="flex flex-col gap-3 md:hidden">
            {creditSales.map((credit) => {
              const {
                productNames,
                categoryNames,
                descriptions,
                totalQty,
                totalPrice,
                paidAmount,
                remainingAmount,
                paymentLines,
              } = getCreditData(credit);

              const isCancelledOrPaid = credit.status === "Paid" || credit.status === "Reverted";

              return (
                <div
                  key={credit._id}
                  className={`rounded-2xl border bg-card p-4 shadow-sm flex flex-col gap-3 ${
                    credit.status === "Paid"
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                      : credit.status === "Reverted"
                        ? "bg-red-500/5 hover:bg-red-500/10"
                        : "hover:bg-muted/20"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm text-foreground ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        <TooltipCell
                          display={productNames.join(", ") || "-"}
                          tooltipLines={productNames}
                          maxChars={30}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-start justify-between gap-2">
                        <CustomerCell
                          invoice={credit}
                          onOpen={() =>
                            setDetailCredit({
                              ...credit,
                              type: "Credit",
                              soldBy: credit.createdBy,
                            })
                          }
                        />
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          credit.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : credit.status === "Reverted"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-sky-500/10 text-sky-600"
                        }`}>
                          {credit.status || "Open"}
                        </span>
                      </div>
                      <div className={`text-xs text-muted-foreground mt-0.5 ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        <TooltipCell
                          display={categoryNames.join(", ") || "Unknown Category"}
                          tooltipLines={categoryNames}
                          maxChars={28}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-black text-emerald-600 text-base ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        PKR {totalPrice.toLocaleString()}
                      </p>
                      <p className={`text-xs font-bold text-muted-foreground bg-muted inline-block px-1.5 py-0.5 rounded ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        Qty: {totalQty}
                      </p>
                    </div>
                  </div>

                  <div className={`text-xs text-foreground bg-muted/40 p-2 rounded-lg border ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                    <TooltipCell
                      display={descriptions.join(" | ") || "No description"}
                      tooltipLines={descriptions.length ? descriptions : ["No description"]}
                      maxChars={55}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border bg-muted/20 p-2">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Paid</div>
                      <TooltipCell
                        display={`PKR ${Number(paidAmount).toLocaleString()}`}
                        tooltipLines={paymentLines.length ? paymentLines : ["No payments received yet"]}
                        maxChars={24}
                        className={`font-black text-emerald-600 ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}
                      />
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-2">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Remaining</div>
                      <div className={`font-black text-red-500 ${isCancelledOrPaid ? "line-through opacity-60" : ""}`}>
                        PKR {Number(remainingAmount).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t pt-2 mt-1">
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(credit.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        By {credit.createdBy?.name || "Unknown"}
                      </div>
                      <button
                        onClick={() => handleAddPayment(credit)}
                        disabled={actioningId === credit._id || credit.status !== "Open"}
                        className="p-1.5 rounded-lg border hover:bg-emerald-500/10 transition-colors text-emerald-600 disabled:opacity-40"
                        title="Add Balance"
                      >
                        <Wallet size={12} />
                      </button>
                      <button
                        onClick={() => handleRevert(credit)}
                        disabled={actioningId === credit._id || credit.status === "Reverted"}
                        className="p-1.5 rounded-lg border hover:bg-amber-500/10 transition-colors text-amber-600 disabled:opacity-40"
                        title="Revert and Restore Stock"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(credit)}
                        disabled={actioningId === credit._id}
                        className="p-1.5 rounded-lg border hover:bg-red-500/10 transition-colors text-red-600 disabled:opacity-40"
                        title="Delete and Restore Stock"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDownload(credit)}
                        disabled={downloadingId === credit._id}
                        className="p-1.5 rounded-lg border hover:bg-primary/10 transition-colors text-primary disabled:opacity-50"
                        title="Download Receipt"
                      >
                        {downloadingId === credit._id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
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
                  onClick={() => goToPage(currentPage + 1)}
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
        open={!!detailCredit}
        onClose={() => setDetailCredit(null)}
        invoice={detailCredit}
        currency="PKR"
      />
    </div>
  );
};

const CreditSalesPage = () => (
  <ProductProvider>
    <CategoryProvider>
      <CreditSaleProvider>
        <CreditSalesInner />
      </CreditSaleProvider>
    </CategoryProvider>
  </ProductProvider>
);

export default CreditSalesPage;
