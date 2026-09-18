"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Wrench,
  ShoppingCart,
  Trash2,
  FileText,
  DollarSign,
  SlidersHorizontal,
  X,
  Eye,
  Inbox,
} from "lucide-react";
import Button from "@/components/ui/Button";
import BillModal from "@/components/BillModal";
import CustomerDetailsForm, {
  CustomerFormValue,
  emptyCustomer,
} from "@/components/dashboard/CustomerDetailsForm";
import toast from "@/utils/toast";

const DEFECT_REASONS = [
  "All",
  "Damaged",
  "Broken",
  "Missing Parts",
  "Cosmetic Damage",
  "Manufacturing Defect",
  "Packaging Damage",
  "Not Working",
  "Wrong Item",
  "Other",
];

const DEFECT_STATUSES = [
  "All",
  "Awaiting Decision",
  "In Repair",
  "Partially In Repair",
  "Repair Completed",
  "Repair Failed",
  "Sold",
  "Scrapped",
];

export const DefectiveInventoryContent = ({ basePath = "/admin" }: { basePath?: string }) => {
  const [defectiveList, setDefectiveList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [reasonFilter, setReasonFilter] = useState("All");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyRepairing, setOnlyRepairing] = useState(false);

  // Overall summary
  const [summary, setSummary] = useState({
    totalAvailable: 0,
    totalRepairing: 0,
    totalSold: 0,
    totalScrapped: 0,
    totalRepairCostSpent: 0,
  });

  // Action Modals State
  const [activeDefective, setActiveDefective] = useState<any>(null);

  // 1. Send to Repair Modal
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairQty, setRepairQty] = useState("1");
  const [technician, setTechnician] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("0");
  const [repairNotes, setRepairNotes] = useState("");
  const [submittingRepair, setSubmittingRepair] = useState(false);

  // 2. Complete Repair Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeRepairJobs, setActiveRepairJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [successQty, setSuccessQty] = useState("1");
  const [failQty, setFailQty] = useState("0");
  const [actualCost, setActualCost] = useState("0");
  const [completeNotes, setCompleteNotes] = useState("");
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // 3. Sell As-Is Modal
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellQty, setSellQty] = useState("1");
  const [sellPrice, setSellPrice] = useState("");
  const [unitSellPrice, setUnitSellPrice] = useState<number>(0);
  const [sellNotes, setSellNotes] = useState("");
  const [customer, setCustomer] = useState<CustomerFormValue>(emptyCustomer);
  const [submittingSell, setSubmittingSell] = useState(false);

  // Selection & Bulk Actions State
  const [selectedDefectiveIds, setSelectedDefectiveIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Bulk Sell Modal State
  const [bulkSellModalOpen, setBulkSellModalOpen] = useState(false);
  const [bulkSellItems, setBulkSellItems] = useState<
    { defectiveId: string; item: any; quantity: number; unitPrice: number; salePrice: number; notes: string }[]
  >([]);
  const [bulkSellCustomer, setBulkSellCustomer] = useState<CustomerFormValue>(emptyCustomer);
  const [submittingBulkSell, setSubmittingBulkSell] = useState(false);

  // Bulk Scrap Modal State
  const [bulkScrapModalOpen, setBulkScrapModalOpen] = useState(false);
  const [bulkScrapItems, setBulkScrapItems] = useState<
    { defectiveId: string; item: any; quantity: number; reason: string; recoveryValue: number; notes: string }[]
  >([]);
  const [submittingBulkScrap, setSubmittingBulkScrap] = useState(false);

  // Bulk Repair Modal State
  const [bulkRepairModalOpen, setBulkRepairModalOpen] = useState(false);
  const [bulkRepairItems, setBulkRepairItems] = useState<
    { defectiveId: string; item: any; quantity: number; estimatedCost: number; notes: string }[]
  >([]);
  const [bulkTechnician, setBulkTechnician] = useState("");
  const [submittingBulkRepair, setSubmittingBulkRepair] = useState(false);

  // Bill Modal for printed defective sale bill
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billData, setBillData] = useState<any>(null);

  // 4. Scrap Modal
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [scrapQty, setScrapQty] = useState("1");
  const [scrapReason, setScrapReason] = useState("Beyond Repair");
  const [recoveryValue, setRecoveryValue] = useState("0");
  const [scrapNotes, setScrapNotes] = useState("");
  const [submittingScrap, setSubmittingScrap] = useState(false);

  // 5. Details / History Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [defectiveDetail, setDefectiveDetail] = useState<any>(null);
  const [repairJobsHistory, setRepairJobsHistory] = useState<any[]>([]);
  const [stockLogsHistory, setStockLogsHistory] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch defective inventory list
  const fetchDefectiveList = useCallback(
    async (pageToFetch: number, showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", pageToFetch.toString());
        params.append("limit", "10");
        if (debouncedSearch) params.append("search", debouncedSearch);
        if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);
        if (reasonFilter && reasonFilter !== "All") params.append("defectReason", reasonFilter);
        if (onlyAvailable) params.append("hasAvailable", "true");
        if (onlyRepairing) params.append("hasRepairing", "true");

        const res = await fetch(`/api/inventory/defective?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setDefectiveList(data.defectiveList || []);
          setTotalPages(data.totalPages || 1);
          setTotalRecords(data.totalRecords || 0);
          if (data.summary) setSummary(data.summary);
        }
      } catch (err) {
        console.error("Error fetching defective inventory:", err);
      } finally {
        if (showLoading) setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, statusFilter, reasonFilter, onlyAvailable, onlyRepairing]
  );

  useEffect(() => {
    fetchDefectiveList(currentPage);
  }, [currentPage, fetchDefectiveList]);

  // Action: Open Send to Repair
  const handleOpenRepair = (item: any) => {
    setActiveDefective(item);
    setRepairQty(item.availableDefectiveQuantity.toString());
    setTechnician("");
    setEstimatedCost("0");
    setRepairNotes("");
    setRepairModalOpen(true);
  };

  const handleConfirmRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDefective) return;

    const qty = Number(repairQty);
    if (qty <= 0 || qty > activeDefective.availableDefectiveQuantity) {
      toast.error(`Quantity must be between 1 and ${activeDefective.availableDefectiveQuantity}`);
      return;
    }

    setSubmittingRepair(true);
    try {
      const res = await fetch(`/api/inventory/defective/${activeDefective._id}/start-repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          technicianOrVendor: technician.trim(),
          estimatedCost: Number(estimatedCost) || 0,
          notes: repairNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${qty} units sent to repair!`);
        setRepairModalOpen(false);
        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to start repair");
      }
    } catch {
      toast.error("Network error starting repair");
    } finally {
      setSubmittingRepair(false);
    }
  };

  // Action: Open Complete Repair Modal
  const handleOpenCompleteRepair = async (item: any) => {
    setActiveDefective(item);
    setCompleteModalOpen(true);
    // Fetch related active repair jobs
    try {
      const res = await fetch(`/api/inventory/defective/${item._id}`);
      const data = await res.json();
      if (data.success) {
        const inProgressJobs = (data.repairJobs || []).filter((j: any) => j.status === "In Progress");
        setActiveRepairJobs(inProgressJobs);
        if (inProgressJobs.length > 0) {
          const first = inProgressJobs[0];
          setSelectedJob(first);
          setSuccessQty(first.quantity.toString());
          setFailQty("0");
          setActualCost((first.estimatedCost || 0).toString());
        } else {
          setSelectedJob(null);
        }
      }
    } catch {
      toast.error("Failed to load active repair jobs");
    }
  };

  const handleConfirmCompleteRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const sQty = Number(successQty);
    const fQty = Number(failQty);

    if (sQty + fQty !== selectedJob.quantity) {
      toast.error(
        `Total outcome (${sQty} successful + ${fQty} failed = ${sQty + fQty}) must equal repair job quantity (${selectedJob.quantity}).`
      );
      return;
    }

    setSubmittingComplete(true);
    try {
      const res = await fetch(`/api/inventory/repairs/${selectedJob._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successfulQty: sQty,
          failedQty: fQty,
          actualCost: Number(actualCost) || 0,
          notes: completeNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          `Repair completed: ${sQty} units added to sellable stock, ${fQty} units returned to defective.`
        );
        setCompleteModalOpen(false);
        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to complete repair");
      }
    } catch {
      toast.error("Network error completing repair");
    } finally {
      setSubmittingComplete(false);
    }
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedDefectiveIds.length === defectiveList.length && defectiveList.length > 0) {
      setSelectedDefectiveIds([]);
    } else {
      setSelectedDefectiveIds(defectiveList.map((d) => d._id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedDefectiveIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Delete Action
  const handleBulkDelete = async () => {
    const idsToDelete = itemToDelete ? [itemToDelete] : selectedDefectiveIds;
    if (idsToDelete.length === 0) return;

    setDeletingBulk(true);
    try {
      const res = await fetch("/api/inventory/defective/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Deleted ${idsToDelete.length} defective item(s).`);
        setSelectedDefectiveIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to delete defective items");
      }
    } catch {
      toast.error("Network error deleting defective items");
    } finally {
      setDeletingBulk(false);
    }
  };

  // Open Bulk Sell
  const handleOpenBulkSell = () => {
    const selected = defectiveList.filter(
      (d) => selectedDefectiveIds.includes(d._id) && d.availableDefectiveQuantity > 0
    );
    if (selected.length === 0) {
      toast.error("None of the selected items have available defective stock to sell.");
      return;
    }
    const rows = selected.map((item) => {
      const basePrice = item.product?.price || item.originalUnitCost || 0;
      const unitP = Math.round(basePrice * 0.75);
      const qty = item.availableDefectiveQuantity;
      return {
        defectiveId: item._id,
        item,
        quantity: qty,
        unitPrice: unitP,
        salePrice: unitP * qty,
        notes: "",
      };
    });
    setBulkSellItems(rows);
    setBulkSellCustomer(emptyCustomer);
    setBulkSellModalOpen(true);
  };

  const handleConfirmBulkSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSellItems.length === 0) return;

    if (!bulkSellCustomer.customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    setSubmittingBulkSell(true);
    try {
      const res = await fetch("/api/inventory/defective/bulk-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: bulkSellItems.map((r) => ({
            defectiveId: r.defectiveId,
            quantity: r.quantity,
            salePrice: r.salePrice,
            notes: r.notes.trim(),
          })),
          customerName: bulkSellCustomer.customerName.trim(),
          customerPhone: bulkSellCustomer.customerPhone.trim(),
          customerEmail: bulkSellCustomer.customerEmail.trim(),
          customerAddress: bulkSellCustomer.customerAddress.trim(),
          customerCity: bulkSellCustomer.customerCity.trim(),
          customerNote: bulkSellCustomer.customerNote.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Bulk sale completed successfully!");
        setBulkSellModalOpen(false);
        setSelectedDefectiveIds([]);

        const inv = data.invoice;
        if (inv) {
          setBillData({
            invoiceNo: inv.invoiceNo || `INV-${inv._id?.slice(-8) || "00000000"}`,
            date: new Date().toLocaleString(),
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            customerAddress: inv.customerAddress,
            customerCity: inv.customerCity,
            customerEmail: inv.customerEmail,
            products: inv.products.map((p: any) => ({
              productName: p.product?.name || "Defective Product",
              quantity: p.quantity,
              salePrice: p.salePrice,
              description: p.description,
              productDescription: p.product?.description || "",
              productImage: p.product?.images?.[0]?.url || "",
            })),
            type: "Sell (As-Is Defective)",
            totalAmount: inv.totalAmount,
            sellerName: inv.soldBy?.name || "Admin",
          });
          setBillModalOpen(true);
        }

        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to complete bulk sale");
      }
    } catch {
      toast.error("Network error during bulk sale");
    } finally {
      setSubmittingBulkSell(false);
    }
  };

  // Open Bulk Scrap
  const handleOpenBulkScrap = () => {
    const selected = defectiveList.filter(
      (d) => selectedDefectiveIds.includes(d._id) && d.availableDefectiveQuantity > 0
    );
    if (selected.length === 0) {
      toast.error("None of the selected items have available defective stock to scrap.");
      return;
    }
    const rows = selected.map((item) => ({
      defectiveId: item._id,
      item,
      quantity: item.availableDefectiveQuantity,
      reason: "Beyond Repair",
      recoveryValue: 0,
      notes: "",
    }));
    setBulkScrapItems(rows);
    setBulkScrapModalOpen(true);
  };

  const handleConfirmBulkScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkScrapItems.length === 0) return;

    setSubmittingBulkScrap(true);
    try {
      const res = await fetch("/api/inventory/defective/bulk-scrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: bulkScrapItems.map((r) => ({
            defectiveId: r.defectiveId,
            quantity: r.quantity,
            reason: r.reason.trim(),
            scrapRecoveryValue: Number(r.recoveryValue) || 0,
            notes: r.notes.trim(),
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Bulk scrap completed successfully!");
        setBulkScrapModalOpen(false);
        setSelectedDefectiveIds([]);
        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to complete bulk scrap");
      }
    } catch {
      toast.error("Network error during bulk scrap");
    } finally {
      setSubmittingBulkScrap(false);
    }
  };

  // Open Bulk Repair
  const handleOpenBulkRepair = () => {
    const selected = defectiveList.filter(
      (d) => selectedDefectiveIds.includes(d._id) && d.availableDefectiveQuantity > 0
    );
    if (selected.length === 0) {
      toast.error("None of the selected items have available defective stock to repair.");
      return;
    }
    const rows = selected.map((item) => ({
      defectiveId: item._id,
      item,
      quantity: item.availableDefectiveQuantity,
      estimatedCost: 0,
      notes: "",
    }));
    setBulkRepairItems(rows);
    setBulkTechnician("");
    setBulkRepairModalOpen(true);
  };

  const handleConfirmBulkRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkRepairItems.length === 0) return;

    setSubmittingBulkRepair(true);
    try {
      const res = await fetch("/api/inventory/defective/bulk-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: bulkRepairItems.map((r) => ({
            defectiveId: r.defectiveId,
            quantity: r.quantity,
            technicianOrVendor: bulkTechnician.trim(),
            estimatedCost: Number(r.estimatedCost) || 0,
            notes: r.notes.trim(),
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Bulk repair initiated successfully!");
        setBulkRepairModalOpen(false);
        setSelectedDefectiveIds([]);
        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to initiate bulk repair");
      }
    } catch {
      toast.error("Network error during bulk repair");
    } finally {
      setSubmittingBulkRepair(false);
    }
  };

  // Action: Open Sell As-Is Modal
  const handleOpenSell = (item: any) => {
    setActiveDefective(item);
    setSellQty(item.availableDefectiveQuantity.toString());
    const basePrice = item.product?.price || item.originalUnitCost || 0;
    const computedUnit = Math.round(basePrice * 0.75);
    setUnitSellPrice(computedUnit);
    setSellPrice((computedUnit * item.availableDefectiveQuantity).toString());
    setSellNotes("");
    setCustomer(emptyCustomer);
    setSellModalOpen(true);
  };

  const handleConfirmSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDefective) return;

    if (!customer.customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    const qty = Number(sellQty);
    if (qty <= 0 || qty > activeDefective.availableDefectiveQuantity) {
      toast.error(`Quantity must be between 1 and ${activeDefective.availableDefectiveQuantity}`);
      return;
    }

    const price = Number(sellPrice);
    if (price <= 0) {
      toast.error("Total sale price must be greater than zero.");
      return;
    }

    setSubmittingSell(true);
    try {
      const res = await fetch(`/api/inventory/defective/${activeDefective._id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          customerName: customer.customerName.trim(),
          customerPhone: customer.customerPhone.trim(),
          customerEmail: customer.customerEmail.trim(),
          customerAddress: customer.customerAddress.trim(),
          customerCity: customer.customerCity.trim(),
          customerNote: customer.customerNote.trim(),
          salePrice: price,
          notes: sellNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Sold ${qty} units as-is! Invoice generated.`);
        setSellModalOpen(false);

        // Prepare Bill Data for modal
        const inv = data.invoice;
        if (inv) {
          setBillData({
            invoiceNo: inv.invoiceNo || `INV-${inv._id?.slice(-8) || "00000000"}`,
            date: new Date().toLocaleString(),
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            customerAddress: inv.customerAddress,
            customerCity: inv.customerCity,
            customerEmail: inv.customerEmail,
            products: inv.products.map((p: any) => ({
              productName: p.product?.name || activeDefective.product?.name,
              quantity: p.quantity,
              salePrice: p.salePrice,
              description: p.description,
              productDescription: p.product?.description || "",
              productImage: p.product?.images?.[0]?.url || "",
            })),
            type: "Sell (As-Is Defective)",
            totalAmount: inv.totalAmount,
            sellerName: inv.soldBy?.name || "Admin",
          });
          setBillModalOpen(true);
        }

        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to sell defective stock");
      }
    } catch {
      toast.error("Network error selling defective stock");
    } finally {
      setSubmittingSell(false);
    }
  };

  // Action: Open Scrap Modal
  const handleOpenScrap = (item: any) => {
    setActiveDefective(item);
    setScrapQty(item.availableDefectiveQuantity.toString());
    setScrapReason("Beyond Repair");
    setRecoveryValue("0");
    setScrapNotes("");
    setScrapModalOpen(true);
  };

  const handleConfirmScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDefective) return;

    const qty = Number(scrapQty);
    if (qty <= 0 || qty > activeDefective.availableDefectiveQuantity) {
      toast.error(`Quantity must be between 1 and ${activeDefective.availableDefectiveQuantity}`);
      return;
    }

    setSubmittingScrap(true);
    try {
      const res = await fetch(`/api/inventory/defective/${activeDefective._id}/scrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          reason: scrapReason.trim(),
          scrapRecoveryValue: Number(recoveryValue) || 0,
          notes: scrapNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${qty} units scrapped.`);
        setScrapModalOpen(false);
        fetchDefectiveList(currentPage, false);
      } else {
        toast.error(data.error || "Failed to scrap items");
      }
    } catch {
      toast.error("Network error scrapping items");
    } finally {
      setSubmittingScrap(false);
    }
  };

  // Action: Open Details Modal
  const handleOpenDetails = async (id: string) => {
    setDetailsModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/inventory/defective/${id}`);
      const data = await res.json();
      if (data.success) {
        setDefectiveDetail(data.defective);
        setRepairJobsHistory(data.repairJobs || []);
        setStockLogsHistory(data.history || []);
      } else {
        toast.error(data.error || "Failed to load details");
      }
    } catch {
      toast.error("Network error loading details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      "Awaiting Decision": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      "In Repair": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      "Partially In Repair": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      "Repair Completed": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      "Repair Failed": "bg-red-500/10 text-red-600 dark:text-red-400",
      "Sold": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      "Scrapped": "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
      "Closed": "bg-muted text-muted-foreground",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${map[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={`${basePath}/inventory`}
            className="p-2 rounded-xl border hover:bg-muted transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="p-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl shadow-sm">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Defective Inventory Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage defective batches: send to repair, complete repairs, sell as-is, or scrap
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchDefectiveList(currentPage, false);
            }}
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl border bg-card shadow-sm border-red-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Available Defective
          </span>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-2">
            {loading ? "..." : summary.totalAvailable.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting repair / disposal</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card shadow-sm border-sky-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
            <Wrench size={13} /> In Repair
          </span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
            {loading ? "..." : summary.totalRepairing.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">With technician</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card shadow-sm border-purple-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <ShoppingCart size={13} /> Sold As-Is
          </span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {loading ? "..." : summary.totalSold.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Direct defective sale</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card shadow-sm border-zinc-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Trash2 size={13} /> Total Scrapped
          </span>
          <div className="text-2xl font-black text-zinc-600 dark:text-zinc-400 mt-2">
            {loading ? "..." : summary.totalScrapped.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Removed from stock</p>
        </div>

        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl border bg-card shadow-sm border-emerald-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <DollarSign size={13} /> Repair Cost Spent
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            Rs. {loading ? "..." : summary.totalRepairCostSpent.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Invested in repairs</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col gap-5">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="Search by product name, SKU, or defect reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer min-w-[150px]"
          >
            <option value="All">All Reasons</option>
            {DEFECT_REASONS.filter((r) => r !== "All").map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Pills & Quick Toggles */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-y py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1">
              <SlidersHorizontal size={13} /> Status:
            </span>
            {DEFECT_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => {
                  setOnlyAvailable(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              Available &gt; 0
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyRepairing}
                onChange={(e) => {
                  setOnlyRepairing(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              In Repair &gt; 0
            </label>
          </div>
        </div>

        {/* Selection & Bulk Actions Toolbar */}
        {defectiveList.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border flex-wrap">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="selectAllDefective"
                checked={defectiveList.length > 0 && selectedDefectiveIds.length === defectiveList.length}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="selectAllDefective" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Select All ({defectiveList.length} on page)
              </label>
            </div>

            {selectedDefectiveIds.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-lg">
                  {selectedDefectiveIds.length} Selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDefectiveIds([])}
                  className="h-8 text-xs font-bold"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenBulkSell}
                  className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1"
                >
                  <ShoppingCart size={13} /> Bulk Sell As-Is
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenBulkScrap}
                  className="h-8 text-xs font-bold bg-zinc-700 hover:bg-zinc-800 text-white gap-1"
                >
                  <Trash2 size={13} /> Bulk Scrap
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenBulkRepair}
                  className="h-8 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white gap-1"
                >
                  <Wrench size={13} /> Bulk Repair
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setItemToDelete(null);
                    setDeleteConfirmOpen(true);
                  }}
                  className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1"
                >
                  <Trash2 size={13} /> Delete Selected
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Defective Entries List */}
        {loading && defectiveList.length === 0 ? (
          <div className="flex flex-col gap-3 py-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : defectiveList.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm border rounded-2xl border-dashed">
            <AlertTriangle size={36} className="mx-auto opacity-30 mb-2 text-red-500" />
            No defective records match your search or filter.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {defectiveList.map((item) => {
              const prod = item.product || {};
              const hasAvailable = item.availableDefectiveQuantity > 0;
              const hasRepairing = item.quantityRepairing > 0;

              return (
                <div
                  key={item._id}
                  className={`border rounded-2xl p-4 transition-all flex flex-col gap-3 shadow-xs ${
                    selectedDefectiveIds.includes(item._id)
                      ? "bg-purple-500/5 border-purple-500/40"
                      : "bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Product & Defect Details */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedDefectiveIds.includes(item._id)}
                        onChange={() => handleToggleSelectOne(item._id)}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-3 shrink-0"
                      />
                      <div className="w-12 h-12 rounded-xl bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                        {prod.images?.[0]?.url ? (
                          <img src={prod.images[0].url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground truncate">{prod.name}</h4>
                          {getStatusBadge(item.status)}
                          <span className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 font-bold px-2 py-0.5 rounded">
                            {item.defectReason}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Identified: {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description ? `"${item.description}"` : "No description notes"}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                          {item.receipt && <span>Receipt: <strong>{item.receipt.receiptNumber}</strong></span>}
                          <span>Orig Cost: <strong>Rs. {item.originalUnitCost?.toLocaleString() || 0}</strong></span>
                          {item.repairCostSpent > 0 && (
                            <span className="text-emerald-600 font-bold">
                              Repair Spent: Rs. {item.repairCostSpent.toLocaleString()}
                            </span>
                          )}
                          <span>Storefront Sellable: <strong>{prod.stock} units</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Counts Pill */}
                    <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl text-xs shrink-0 self-start lg:self-center">
                      <div className="text-center px-2">
                        <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 block">
                          Available Defective
                        </span>
                        <span className="text-base font-black text-red-600 dark:text-red-400">
                          {item.availableDefectiveQuantity}
                        </span>
                      </div>

                      <div className="text-center px-2 border-l">
                        <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">
                          In Repair
                        </span>
                        <span className="text-base font-black text-sky-600 dark:text-sky-400">
                          {item.quantityRepairing}
                        </span>
                      </div>

                      {(item.quantitySold > 0 || item.quantityScrapped > 0) && (
                        <div className="text-center px-2 border-l">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Resolved
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {item.quantitySold > 0 ? `${item.quantitySold} Sold ` : ""}
                            {item.quantityScrapped > 0 ? `${item.quantityScrapped} Scrapped` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
                    <button
                      onClick={() => handleOpenDetails(item._id)}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Eye size={13} /> View Audit History & Jobs
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Send to Repair */}
                      {hasAvailable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenRepair(item)}
                          className="gap-1 text-xs border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 font-bold"
                        >
                          <Wrench size={13} /> Send To Repair
                        </Button>
                      )}

                      {/* Complete Repair */}
                      {hasRepairing && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenCompleteRepair(item)}
                          className="gap-1 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold"
                        >
                          <CheckCircle2 size={13} /> Complete Repair
                        </Button>
                      )}

                      {/* Sell As-Is */}
                      {hasAvailable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSell(item)}
                          className="gap-1 text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold"
                        >
                          <ShoppingCart size={13} /> Sell As-Is
                        </Button>
                      )}

                      {/* Scrap */}
                      {hasAvailable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenScrap(item)}
                          className="gap-1 text-xs text-red-600 hover:bg-red-500/10 font-bold"
                        >
                          <Trash2 size={13} /> Scrap
                        </Button>
                      )}

                      {/* Single Item Delete */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setItemToDelete(item._id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="p-1.5 h-7 w-7 text-red-600 hover:bg-red-500/10"
                        title="Delete defective entry"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalRecords} records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="gap-1 h-8 px-2 text-xs"
              >
                <ChevronLeft size={13} /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="gap-1 h-8 px-2 text-xs"
              >
                Next <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ─── MODAL 1: SEND TO REPAIR ─── */}
      {/* ========================================================= */}
      {repairModalOpen && activeDefective && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-sky-600">
              <Wrench size={20} />
              <h4 className="font-black text-base text-foreground">Send Stock to Repair</h4>
            </div>

            <p className="text-xs text-muted-foreground">
              Quantity will transition from Available Defective to In Repair.
            </p>

            <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between">
              <span>Available Defective:</span>
              <strong className="text-red-600 font-bold">{activeDefective.availableDefectiveQuantity} units</strong>
            </div>

            <form onSubmit={handleConfirmRepair} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Quantity to Send to Repair *</span>
                <input
                  type="number"
                  min={1}
                  max={activeDefective.availableDefectiveQuantity}
                  required
                  value={repairQty}
                  onChange={(e) => setRepairQty(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-base font-black text-center outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Technician / Repair Vendor (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. In-house Master Technician / Vendor X"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Estimated Repair Cost (PKR)</span>
                <input
                  type="number"
                  min={0}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Repair Notes</span>
                <textarea
                  rows={2}
                  placeholder="Describe repair requirements (e.g. replace screen ribbon)..."
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  className="w-full rounded-xl border bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRepairModalOpen(false)}
                  disabled={submittingRepair}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingRepair}
                  className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  {submittingRepair ? <RefreshCw size={14} className="animate-spin" /> : <Wrench size={14} />}
                  Confirm Start Repair
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 2: COMPLETE REPAIR ─── */}
      {/* ========================================================= */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-emerald-600">
              <CheckCircle2 size={20} />
              <h4 className="font-black text-base text-foreground">Complete Repair</h4>
            </div>

            {activeRepairJobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active repair jobs in progress for this item.
              </div>
            ) : (
              <form onSubmit={handleConfirmCompleteRepair} className="flex flex-col gap-3">
                {activeRepairJobs.length > 1 && (
                  <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                    <span>Select Repair Job *</span>
                    <select
                      value={selectedJob?._id}
                      onChange={(e) => {
                        const job = activeRepairJobs.find((j) => j._id === e.target.value);
                        setSelectedJob(job);
                        if (job) {
                          setSuccessQty(job.quantity.toString());
                          setFailQty("0");
                          setActualCost((job.estimatedCost || 0).toString());
                        }
                      }}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-xs"
                    >
                      {activeRepairJobs.map((j) => (
                        <option key={j._id} value={j._id}>
                          Qty: {j.quantity} ({j.technicianOrVendor || "In-house"}) - Started:{" "}
                          {new Date(j.startDate).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between">
                  <span>Job Repair Quantity:</span>
                  <strong className="text-foreground font-bold">{selectedJob?.quantity} units</strong>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Successful Qty *</span>
                    <input
                      type="number"
                      min={0}
                      max={selectedJob?.quantity}
                      required
                      value={successQty}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSuccessQty(val);
                        const num = parseInt(val) || 0;
                        if (selectedJob) {
                          setFailQty(Math.max(0, selectedJob.quantity - num).toString());
                        }
                      }}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                    <span>Failed Qty *</span>
                    <input
                      type="number"
                      min={0}
                      max={selectedJob?.quantity}
                      required
                      value={failQty}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFailQty(val);
                        const num = parseInt(val) || 0;
                        if (selectedJob) {
                          setSuccessQty(Math.max(0, selectedJob.quantity - num).toString());
                        }
                      }}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                  </label>
                </div>

                <p className="text-[10px] text-muted-foreground italic">
                  Successful units (+{successQty || 0}) will move to normal sellable stock. Failed units (+{failQty || 0}) return to defective stock.
                </p>

                <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                  <span>Actual Repair Cost Incurred (PKR)</span>
                  <input
                    type="number"
                    min={0}
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                  <span>Completion Notes</span>
                  <input
                    type="text"
                    placeholder="e.g. Component replaced, fully tested"
                    value={completeNotes}
                    onChange={(e) => setCompleteNotes(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCompleteModalOpen(false)}
                    disabled={submittingComplete}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingComplete}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {submittingComplete ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Complete Repair
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 3: SELL AS-IS ─── */}
      {/* ========================================================= */}
      {sellModalOpen && activeDefective && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-purple-600">
              <ShoppingCart size={20} />
              <div>
                <h4 className="font-black text-base text-foreground">Sell Defective Stock As-Is</h4>
                <p className="text-xs text-muted-foreground">
                  Generates an existing invoice directly. Normal sellable stock will NOT be touched.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between">
              <span>Available Defective:</span>
              <strong className="text-red-600 font-bold">{activeDefective.availableDefectiveQuantity} units</strong>
            </div>

            <form onSubmit={handleConfirmSell} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                  <span>Quantity to Sell *</span>
                  <input
                    type="number"
                    min={1}
                    max={activeDefective.availableDefectiveQuantity}
                    required
                    value={sellQty}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSellQty(val);
                      const n = parseInt(val) || 0;
                      if (n > 0 && unitSellPrice > 0) {
                        setSellPrice((n * unitSellPrice).toString());
                      }
                    }}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                  <span>
                    Total Sale Price (PKR) *
                    {unitSellPrice > 0 && (
                      <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400 ml-1">
                        (Rs. {unitSellPrice}/unit)
                      </span>
                    )}
                  </span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </label>
              </div>

              {/* Existing Customer Details Form */}
              <div className="border rounded-2xl p-3.5 bg-background">
                <CustomerDetailsForm
                  value={customer}
                  onChange={setCustomer}
                  disabled={submittingSell}
                />
              </div>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Sale / Condition Memo (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Sold as-is with minor cosmetic blemishes"
                  value={sellNotes}
                  onChange={(e) => setSellNotes(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSellModalOpen(false)}
                  disabled={submittingSell}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingSell}
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {submittingSell ? <RefreshCw size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                  Complete Sale & Generate Bill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Modal on Defective Sale */}
      {billModalOpen && billData && (
        <BillModal
          isOpen={billModalOpen}
          onClose={() => setBillModalOpen(false)}
          billData={billData}
        />
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 4: SCRAP STOCK ─── */}
      {/* ========================================================= */}
      {scrapModalOpen && activeDefective && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-red-600">
              <Trash2 size={20} />
              <div>
                <h4 className="font-black text-base text-foreground">Scrap Defective Stock</h4>
                <p className="text-xs text-muted-foreground">
                  Permanent removal from active inventory. Will not enter sellable stock.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between">
              <span>Available Defective:</span>
              <strong className="text-red-600 font-bold">{activeDefective.availableDefectiveQuantity} units</strong>
            </div>

            <form onSubmit={handleConfirmScrap} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Quantity to Scrap *</span>
                <input
                  type="number"
                  min={1}
                  max={activeDefective.availableDefectiveQuantity}
                  required
                  value={scrapQty}
                  onChange={(e) => setScrapQty(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Scrap Reason *</span>
                <select
                  value={scrapReason}
                  onChange={(e) => setScrapReason(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="Beyond Repair">Beyond Repair</option>
                  <option value="Total Loss">Total Loss</option>
                  <option value="Cannibalized for Spare Parts">Cannibalized for Spare Parts</option>
                  <option value="Obsolete & Unusable">Obsolete &amp; Unusable</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Recovery / Scrap Value Received (PKR)</span>
                <input
                  type="number"
                  min={0}
                  value={recoveryValue}
                  onChange={(e) => setRecoveryValue(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Notes / Disposal Memo</span>
                <textarea
                  rows={2}
                  placeholder="Disposal details..."
                  value={scrapNotes}
                  onChange={(e) => setScrapNotes(e.target.value)}
                  className="w-full rounded-xl border bg-background p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScrapModalOpen(false)}
                  disabled={submittingScrap}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingScrap}
                  className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {submittingScrap ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Confirm Scrap Disposal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 5: DETAILS & HISTORY ─── */}
      {/* ========================================================= */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col gap-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-primary" />
                <h4 className="font-black text-base">Defective Batch History &amp; Audit Trail</h4>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center text-muted-foreground">
                <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                Loading history...
              </div>
            ) : !defectiveDetail ? (
              <div className="py-10 text-center text-muted-foreground">No details found.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Meta summary */}
                <div className="p-3.5 rounded-xl bg-muted/40 border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Product</span>
                    <span className="font-bold truncate block">{defectiveDetail.product?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Defect Reason</span>
                    <span className="font-bold text-red-600">{defectiveDetail.defectReason}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Original Qty</span>
                    <span className="font-bold">{defectiveDetail.originalQuantity} units</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Available Defective</span>
                    <span className="font-bold text-red-600">{defectiveDetail.availableDefectiveQuantity} units</span>
                  </div>
                </div>

                {/* Repair Jobs History */}
                <div className="flex flex-col gap-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Repair Jobs ({repairJobsHistory.length})
                  </h5>
                  {repairJobsHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No repair jobs initiated yet.</p>
                  ) : (
                    <div className="divide-y border rounded-xl bg-background">
                      {repairJobsHistory.map((j) => (
                        <div key={j._id} className="p-3 text-xs flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{j.technicianOrVendor || "In-house Technician"}</span>
                            <span className="font-bold text-[10px] bg-sky-500/10 text-sky-600 px-2 py-0.5 rounded">
                              {j.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                            <span>Quantity: {j.quantity}</span>
                            {j.quantityRepaired > 0 && <span className="text-emerald-600 font-bold">Repaired: {j.quantityRepaired}</span>}
                            {j.quantityFailed > 0 && <span className="text-red-600 font-bold">Failed: {j.quantityFailed}</span>}
                            <span>Cost: Rs. {j.actualCost || j.estimatedCost || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stock Movement Logs */}
                <div className="flex flex-col gap-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Audit Trail Movements ({stockLogsHistory.length})
                  </h5>
                  {stockLogsHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No movement logs recorded yet.</p>
                  ) : (
                    <div className="divide-y border rounded-xl bg-background max-h-48 overflow-y-auto">
                      {stockLogsHistory.map((l) => (
                        <div key={l._id} className="p-2.5 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-bold">{l.description}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(l.createdAt).toLocaleString()} • {l.performedBy?.name || "System"}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-bold text-muted-foreground">
                            {l.fromState} → {l.toState}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* ─── BULK MODAL 1: BULK SELL AS-IS ─── */}
      {/* ========================================================= */}
      {bulkSellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3 text-purple-600">
              <div className="flex items-center gap-2.5">
                <ShoppingCart size={22} />
                <div>
                  <h4 className="font-black text-base text-foreground">Bulk Sell Defective Stock As-Is</h4>
                  <p className="text-xs text-muted-foreground">
                    Sell multiple defective items on a single invoice. Prices auto-calculate and can be manually edited.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkSellModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmBulkSell} className="flex flex-col gap-4">
              {/* Items List Table */}
              <div className="border rounded-2xl overflow-hidden bg-background">
                <div className="p-3 bg-muted/40 border-b text-xs font-black uppercase text-muted-foreground flex justify-between">
                  <span>Selected Items ({bulkSellItems.length})</span>
                  <span>
                    Auto-Calculated Total: Rs.{" "}
                    {bulkSellItems
                      .reduce((s, i) => s + (Number(i.salePrice) || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="divide-y max-h-60 overflow-y-auto">
                  {bulkSellItems.map((row, idx) => (
                    <div
                      key={row.defectiveId}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="min-w-0">
                          <p className="font-bold truncate text-foreground">
                            {row.item.product?.name || "Defective Product"}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            Available: {row.item.availableDefectiveQuantity} • Rate: Rs. {row.unitPrice}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="flex items-center gap-1 font-bold text-muted-foreground">
                          <span>Qty:</span>
                          <input
                            type="number"
                            min={1}
                            max={row.item.availableDefectiveQuantity}
                            required
                            value={row.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setBulkSellItems((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? { ...r, quantity: val, salePrice: val * r.unitPrice }
                                    : r
                                )
                              );
                            }}
                            className="w-16 rounded-lg border bg-background p-1.5 text-center font-bold outline-none focus:ring-2 focus:ring-purple-500/40"
                          />
                        </label>
                        <label className="flex items-center gap-1 font-bold text-muted-foreground">
                          <span>Price (PKR):</span>
                          <input
                            type="number"
                            min={0}
                            required
                            value={row.salePrice}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setBulkSellItems((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, salePrice: val } : r
                                )
                              );
                            }}
                            className="w-24 rounded-lg border bg-background p-1.5 text-center font-bold text-purple-600 outline-none focus:ring-2 focus:ring-purple-500/40"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Details Form */}
              <div className="border rounded-2xl p-3.5 bg-background">
                <CustomerDetailsForm
                  value={bulkSellCustomer}
                  onChange={setBulkSellCustomer}
                  disabled={submittingBulkSell}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div className="text-xs">
                  <span className="text-muted-foreground">Grand Total: </span>
                  <strong className="text-purple-600 font-black text-sm">
                    Rs.{" "}
                    {bulkSellItems
                      .reduce((s, i) => s + (Number(i.salePrice) || 0), 0)
                      .toLocaleString()}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkSellModalOpen(false)}
                    disabled={submittingBulkSell}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingBulkSell}
                    className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    {submittingBulkSell ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ShoppingCart size={14} />
                    )}
                    Complete Bulk Sale
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── BULK MODAL 2: BULK SCRAP ─── */}
      {/* ========================================================= */}
      {bulkScrapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3 text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-2.5">
                <Trash2 size={22} className="text-red-600" />
                <div>
                  <h4 className="font-black text-base text-foreground">Bulk Scrap Defective Stock</h4>
                  <p className="text-xs text-muted-foreground">
                    Permanently remove multiple defective batches from active inventory.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkScrapModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmBulkScrap} className="flex flex-col gap-4">
              <div className="border rounded-2xl overflow-hidden bg-background divide-y max-h-60 overflow-y-auto">
                {bulkScrapItems.map((row, idx) => (
                  <div
                    key={row.defectiveId}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-foreground">
                        {row.item.product?.name || "Defective Product"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        Available: {row.item.availableDefectiveQuantity} units • Reason: {row.item.defectReason}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1 font-bold text-muted-foreground">
                        <span>Qty:</span>
                        <input
                          type="number"
                          min={1}
                          max={row.item.availableDefectiveQuantity}
                          required
                          value={row.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setBulkScrapItems((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                            );
                          }}
                          className="w-16 rounded-lg border bg-background p-1.5 text-center font-bold outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                      <label className="flex items-center gap-1 font-bold text-muted-foreground">
                        <span>Recovery:</span>
                        <input
                          type="number"
                          min={0}
                          value={row.recoveryValue}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setBulkScrapItems((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, recoveryValue: val } : r))
                            );
                          }}
                          className="w-20 rounded-lg border bg-background p-1.5 text-center font-bold outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Total Recovery:{" "}
                  <strong className="text-foreground">
                    Rs.{" "}
                    {bulkScrapItems
                      .reduce((s, i) => s + (Number(i.recoveryValue) || 0), 0)
                      .toLocaleString()}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkScrapModalOpen(false)}
                    disabled={submittingBulkScrap}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingBulkScrap}
                    className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    {submittingBulkScrap ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Scrap All ({bulkScrapItems.length})
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── BULK MODAL 3: BULK REPAIR ─── */}
      {/* ========================================================= */}
      {bulkRepairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3 text-sky-600">
              <div className="flex items-center gap-2.5">
                <Wrench size={22} />
                <div>
                  <h4 className="font-black text-base text-foreground">Bulk Send Defective Stock to Repair</h4>
                  <p className="text-xs text-muted-foreground">
                    Assign multiple defective batches to a technician/vendor for repair.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkRepairModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmBulkRepair} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
                <span>Technician / Service Vendor</span>
                <input
                  type="text"
                  placeholder="e.g. Master Tech Lab, In-House QA"
                  value={bulkTechnician}
                  onChange={(e) => setBulkTechnician(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <div className="border rounded-2xl overflow-hidden bg-background divide-y max-h-60 overflow-y-auto">
                {bulkRepairItems.map((row, idx) => (
                  <div
                    key={row.defectiveId}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-foreground">
                        {row.item.product?.name || "Defective Product"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        Available: {row.item.availableDefectiveQuantity} units • Defect: {row.item.defectReason}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1 font-bold text-muted-foreground">
                        <span>Qty:</span>
                        <input
                          type="number"
                          min={1}
                          max={row.item.availableDefectiveQuantity}
                          required
                          value={row.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setBulkRepairItems((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                            );
                          }}
                          className="w-16 rounded-lg border bg-background p-1.5 text-center font-bold outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                      <label className="flex items-center gap-1 font-bold text-muted-foreground">
                        <span>Est Cost:</span>
                        <input
                          type="number"
                          min={0}
                          value={row.estimatedCost}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setBulkRepairItems((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, estimatedCost: val } : r))
                            );
                          }}
                          className="w-20 rounded-lg border bg-background p-1.5 text-center font-bold outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Total Est Cost:{" "}
                  <strong className="text-foreground">
                    Rs.{" "}
                    {bulkRepairItems
                      .reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0)
                      .toLocaleString()}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkRepairModalOpen(false)}
                    disabled={submittingBulkRepair}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingBulkRepair}
                    className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold"
                  >
                    {submittingBulkRepair ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Wrench size={14} />
                    )}
                    Send All to Repair ({bulkRepairItems.length})
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ─── MODAL 6: DELETE CONFIRMATION ─── */}
      {/* ========================================================= */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b pb-3 text-red-600">
              <Trash2 size={20} />
              <h4 className="font-black text-base text-foreground">Confirm Deletion</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {itemToDelete
                ? "Are you sure you want to permanently delete this defective stock entry?"
                : `Are you sure you want to permanently delete the ${selectedDefectiveIds.length} selected defective stock entries?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                }}
                disabled={deletingBulk}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deletingBulk}
                onClick={handleBulkDelete}
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {deletingBulk ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete {itemToDelete ? "Entry" : `(${selectedDefectiveIds.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDefectiveInventoryPage = () => {
  return <DefectiveInventoryContent basePath="/admin" />;
};

export default AdminDefectiveInventoryPage;
