"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Button from "@/components/ui/Button";
import TooltipCell from "@/components/ui/TooltipCell";
import BillModal from "@/components/BillModal";
import { toast } from "@/components/ui/Toast";
import {
  Wrench,
  Search,
  Package,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ShoppingBag,
  Info,
  Check,
  Loader2,
} from "lucide-react";

interface RepairBillContentProps {
  basePath?: string; // "/admin" or "/owner"
}

interface StagedRepairItem {
  source: "customer" | "defective";
  productId: string;
  defectiveId?: string;
  productName: string;
  productImage?: string;
  defectReason: string;
  availableQty?: number;
  quantity: number;
  estimatedCost: number;
  notes: string;
}

export const RepairBillContent: React.FC<RepairBillContentProps> = ({
  basePath = "/admin",
}) => {
  const [activeTab, setActiveTab] = useState<"dispatch" | "tracking">("dispatch");

  // ── Mode Switcher: "customer" vs "defective" ──
  const [repairSource, setRepairSource] = useState<"customer" | "defective">("customer");

  // ── Dispatch Form State ──
  // Customer details (for Customer Repair)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Vendor / Technician details (for both or workshop assignment)
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatching, setDispatching] = useState(false);

  // ── Customer Repair: Product Catalog State ──
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [catalogDropdownOpen, setCatalogDropdownOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCustomerProduct, setSelectedCustomerProduct] = useState<any | null>(null);
  const [customerDropdownPlacement, setCustomerDropdownPlacement] = useState<"down" | "up">("down");
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const isInitialCatalogSearch = useRef(true);

  // ── Store Defective Stock State ──
  const [defectiveItems, setDefectiveItems] = useState<any[]>([]);
  const [loadingDefective, setLoadingDefective] = useState(false);
  const [isSearchingDefective, setIsSearchingDefective] = useState(false);
  const [selectedDefectiveId, setSelectedDefectiveId] = useState("");
  const [selectedDefectiveRecord, setSelectedDefectiveRecord] = useState<any | null>(null);
  const [defectiveDropdownOpen, setDefectiveDropdownOpen] = useState(false);
  const [defectiveSearchQuery, setDefectiveSearchQuery] = useState("");
  const [defectiveDropdownPlacement, setDefectiveDropdownPlacement] = useState<"down" | "up">("down");
  const defectiveDropdownRef = useRef<HTMLDivElement | null>(null);
  const defectiveSearchInputRef = useRef<HTMLInputElement | null>(null);
  const isInitialDefectiveSearch = useRef(true);

  // Shared item staging inputs
  const [selectedQty, setSelectedQty] = useState("1");
  const [selectedEstCost, setSelectedEstCost] = useState("0");
  const [selectedDefectReason, setSelectedDefectReason] = useState("");
  const [selectedItemNote, setSelectedItemNote] = useState("");

  // Staged items for current dispatch challan (Multi-product support)
  const [stagedItems, setStagedItems] = useState<StagedRepairItem[]>([]);

  // ── Bill Modal State ──
  const [showBillModal, setShowBillModal] = useState(false);
  const [lastBillData, setLastBillData] = useState<any>(null);
  const [reprintingChallanNo, setReprintingChallanNo] = useState<string | null>(null);

  // ── Tracking State ──
  const [repairJobs, setRepairJobs] = useState<any[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [vendorsList, setVendorsList] = useState<string[]>([]);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("All");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [searchTracking, setSearchTracking] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(false);

  // ── Complete Repair Modal State ──
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeJobToComplete, setActiveJobToComplete] = useState<any>(null);
  const [successQty, setSuccessQty] = useState("0");
  const [failQty, setFailQty] = useState("0");
  const [actualCost, setActualCost] = useState("0");
  const [completeNotes, setCompleteNotes] = useState("");
  const [completing, setCompleting] = useState(false);

  // Fetch product catalog for customer repairs
  const fetchCatalogProducts = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/products?limit=100");
      const data = await res.json();
      if (data.products) {
        setCatalogProducts(data.products);
      }
    } catch (err) {
      console.error("Error fetching catalog products:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  // Fetch available defective inventory
  const fetchDefectiveInventory = useCallback(async () => {
    setLoadingDefective(true);
    try {
      const res = await fetch("/api/inventory/defective?hasAvailable=true&limit=100");
      const data = await res.json();
      const list = data.defectiveList || data.defective || [];
      setDefectiveItems(list);
    } catch (err) {
      console.error("Error fetching defective inventory:", err);
    } finally {
      setLoadingDefective(false);
    }
  }, []);

  // Fetch repair jobs for tracking
  const fetchRepairJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "15");
      if (selectedSourceFilter !== "All") params.append("source", selectedSourceFilter);
      if (selectedVendorFilter !== "All") params.append("vendor", selectedVendorFilter);
      if (selectedStatusFilter !== "All") params.append("status", selectedStatusFilter);
      if (searchTracking.trim()) params.append("search", searchTracking.trim());

      const res = await fetch(`/api/inventory/repairs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRepairJobs(data.repairJobs || []);
        setTotalJobs(data.totalJobs || 0);
        setTotalPages(data.totalPages || 1);
        if (data.vendors) {
          setVendorsList(data.vendors);
        }
      }
    } catch (err) {
      console.error("Error fetching repair jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  }, [currentPage, selectedSourceFilter, selectedVendorFilter, selectedStatusFilter, searchTracking]);

  useEffect(() => {
    fetchCatalogProducts();
    fetchDefectiveInventory();
  }, [fetchCatalogProducts, fetchDefectiveInventory]);

  useEffect(() => {
    fetchRepairJobs();
  }, [fetchRepairJobs]);

  // ── Collision-aware positioning helper ──
  const checkPlacement = (ref: React.RefObject<HTMLDivElement | null>): "down" | "up" => {
    if (!ref.current) return "down";
    const rect = ref.current.getBoundingClientRect();
    const dropdownHeight = 360; // Estimated height of popover
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      return "up";
    }
    return "down";
  };

  const handleToggleCustomerDropdown = () => {
    if (!catalogDropdownOpen) {
      setCustomerDropdownPlacement(checkPlacement(customerDropdownRef));
      setCatalogDropdownOpen(true);
    } else {
      setCatalogDropdownOpen(false);
    }
  };

  const handleToggleDefectiveDropdown = () => {
    if (!defectiveDropdownOpen) {
      setDefectiveDropdownPlacement(checkPlacement(defectiveDropdownRef));
      setDefectiveDropdownOpen(true);
    } else {
      setDefectiveDropdownOpen(false);
    }
  };

  // Re-calculate placement on window scroll/resize while dropdown is active
  useEffect(() => {
    if (!catalogDropdownOpen) return;
    const onScrollOrResize = () => {
      setCustomerDropdownPlacement(checkPlacement(customerDropdownRef));
    };
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [catalogDropdownOpen]);

  useEffect(() => {
    if (!defectiveDropdownOpen) return;
    const onScrollOrResize = () => {
      setDefectiveDropdownPlacement(checkPlacement(defectiveDropdownRef));
    };
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [defectiveDropdownOpen]);

  // Auto-focus customer search input when dropdown opens
  useEffect(() => {
    if (catalogDropdownOpen) {
      const timer = setTimeout(() => {
        customerSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setCatalogSearchQuery("");
    }
  }, [catalogDropdownOpen]);

  // Auto-focus defective search input when dropdown opens
  useEffect(() => {
    if (defectiveDropdownOpen) {
      const timer = setTimeout(() => {
        defectiveSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setDefectiveSearchQuery("");
    }
  }, [defectiveDropdownOpen]);

  // Click outside to close customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target as Node)
      ) {
        setCatalogDropdownOpen(false);
      }
    };
    if (catalogDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [catalogDropdownOpen]);

  // Click outside to close defective dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        defectiveDropdownRef.current &&
        !defectiveDropdownRef.current.contains(e.target as Node)
      ) {
        setDefectiveDropdownOpen(false);
      }
    };
    if (defectiveDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [defectiveDropdownOpen]);

  // ── Debounced Backend Search for Customer Catalog Products (350ms) ──
  useEffect(() => {
    if (!catalogDropdownOpen) return;
    if (isInitialCatalogSearch.current && !catalogSearchQuery.trim() && catalogProducts.length > 0) {
      isInitialCatalogSearch.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const q = catalogSearchQuery.trim();
      setIsSearchingCatalog(true);
      try {
        const url = q
          ? `/api/products?search=${encodeURIComponent(q)}&limit=100`
          : `/api/products?limit=100`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.products) {
          setCatalogProducts(data.products);
        }
      } catch (err) {
        console.error("Error searching catalog products:", err);
      } finally {
        setIsSearchingCatalog(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [catalogSearchQuery, catalogDropdownOpen, catalogProducts.length]);

  // ── Debounced Backend Search for Defective Stock Inventory (350ms) ──
  useEffect(() => {
    if (!defectiveDropdownOpen) return;
    if (isInitialDefectiveSearch.current && !defectiveSearchQuery.trim() && defectiveItems.length > 0) {
      isInitialDefectiveSearch.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const q = defectiveSearchQuery.trim();
      setIsSearchingDefective(true);
      try {
        const url = q
          ? `/api/inventory/defective?hasAvailable=true&search=${encodeURIComponent(q)}&limit=100`
          : `/api/inventory/defective?hasAvailable=true&limit=100`;
        const res = await fetch(url);
        const data = await res.json();
        const list = data.defectiveList || data.defective || [];
        setDefectiveItems(list);
      } catch (err) {
        console.error("Error searching defective inventory:", err);
      } finally {
        setIsSearchingDefective(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [defectiveSearchQuery, defectiveDropdownOpen, defectiveItems.length]);

  // Filtered catalog products for customer repair picker (instant typing response)
  const filteredCatalogProducts = useMemo(() => {
    if (!catalogSearchQuery.trim()) return catalogProducts;
    const q = catalogSearchQuery.toLowerCase().trim();
    return catalogProducts.filter((p) => {
      const prodName = (p.name || "").toLowerCase();
      const barcode = (p.barcode || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const cat =
        typeof p.category === "object"
          ? (p.category?.name || "").toLowerCase()
          : (p.category || "").toLowerCase();

      return (
        prodName.includes(q) ||
        barcode.includes(q) ||
        desc.includes(q) ||
        cat.includes(q)
      );
    });
  }, [catalogProducts, catalogSearchQuery]);

  // Filtered defective items: ONLY available defective inventory items (instant typing response)
  const filteredDefectiveItems = useMemo(() => {
    if (!defectiveItems || defectiveItems.length === 0) return [];
    // Show only batches that have availableDefectiveQuantity > 0
    const available = defectiveItems.filter((d) => (d.availableDefectiveQuantity ?? 0) > 0);
    if (!defectiveSearchQuery.trim()) return available;

    const q = defectiveSearchQuery.toLowerCase().trim();
    return available.filter((d) => {
      const prodName = (d.product?.name || "").toLowerCase();
      const barcode = (d.product?.barcode || "").toLowerCase();
      const reason = (d.defectReason || "").toLowerCase();
      const desc = (d.description || "").toLowerCase();
      const cat =
        typeof d.product?.category === "object"
          ? (d.product?.category?.name || "").toLowerCase()
          : "";

      return (
        prodName.includes(q) ||
        barcode.includes(q) ||
        reason.includes(q) ||
        desc.includes(q) ||
        cat.includes(q)
      );
    });
  }, [defectiveItems, defectiveSearchQuery]);

  // Currently selected customer catalog product details
  const selectedCustomerProductDetail = useMemo(() => {
    if (!selectedProductId) return null;
    return (
      selectedCustomerProduct ||
      catalogProducts.find((p) => p._id === selectedProductId) ||
      null
    );
  }, [catalogProducts, selectedProductId, selectedCustomerProduct]);

  // Currently selected defective item details
  const selectedDefectiveItem = useMemo(() => {
    if (!selectedDefectiveId) return null;
    return (
      selectedDefectiveRecord ||
      defectiveItems.find((d) => d._id === selectedDefectiveId) ||
      null
    );
  }, [defectiveItems, selectedDefectiveId, selectedDefectiveRecord]);

  const handleSelectProduct = (prod: any) => {
    setSelectedProductId(prod._id);
    setSelectedCustomerProduct(prod);
    setCatalogDropdownOpen(false);
    setCatalogSearchQuery("");
  };

  const handleClearCustomerProductSelection = () => {
    setSelectedProductId("");
    setSelectedCustomerProduct(null);
    setSelectedQty("1");
    setSelectedEstCost("0");
    setSelectedDefectReason("");
    setSelectedItemNote("");
  };

  const handleSelectDefective = (def: any) => {
    setSelectedDefectiveId(def._id);
    setSelectedDefectiveRecord(def);
    if (def.defectReason) {
      setSelectedDefectReason(def.defectReason);
    }
    if (def.description && !selectedItemNote) {
      setSelectedItemNote(def.description);
    }
    setDefectiveDropdownOpen(false);
    setDefectiveSearchQuery("");
  };

  const handleClearDefectiveSelection = () => {
    setSelectedDefectiveId("");
    setSelectedDefectiveRecord(null);
    setSelectedDefectReason("");
    setSelectedItemNote("");
    setSelectedQty("1");
    setSelectedEstCost("0");
  };

  // Handle stage item for Customer Repair
  const handleStageCustomerItem = () => {
    if (!selectedProductId) {
      toast.error("Please select a product from catalog for customer repair.");
      return;
    }
    const prod = selectedCustomerProductDetail;
    if (!prod) {
      toast.error("Selected product details not found. Please re-select.");
      return;
    }

    const qty = parseInt(selectedQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive whole number.");
      return;
    }

    const estCost = parseFloat(selectedEstCost) || 0;
    const defect = selectedDefectReason.trim() || selectedItemNote.trim() || "Customer Reported Fault";
    const img =
      prod.images?.[0]?.url ||
      (typeof prod.images?.[0] === "string" ? prod.images[0] : null) ||
      prod.image;

    // Append to staged items list
    setStagedItems((prev) => [
      ...prev,
      {
        source: "customer",
        productId: prod._id,
        productName: prod.name || "Customer Product",
        productImage: img,
        defectReason: defect,
        quantity: qty,
        estimatedCost: estCost,
        notes: selectedItemNote.trim(),
      },
    ]);

    // Reset selection
    setSelectedProductId("");
    setSelectedCustomerProduct(null);
    setSelectedQty("1");
    setSelectedEstCost("0");
    setSelectedDefectReason("");
    setSelectedItemNote("");
    toast.success(`Added "${prod.name}" to repair challan.`);
  };

  // Handle stage item for Store Defective Stock
  const handleStageDefectiveItem = () => {
    if (!selectedDefectiveId) {
      toast.error("Please select a defective stock batch.");
      return;
    }
    const def = selectedDefectiveItem;
    if (!def) return;

    const qty = parseInt(selectedQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }
    if (qty > def.availableDefectiveQuantity) {
      toast.error(`Only ${def.availableDefectiveQuantity} units available in this batch.`);
      return;
    }

    const estCost = parseFloat(selectedEstCost) || 0;

    // Check if already staged to update quantity
    const existingIdx = stagedItems.findIndex(
      (it) => it.source === "defective" && it.defectiveId === selectedDefectiveId
    );

    const img =
      def.product?.images?.[0]?.url ||
      (typeof def.product?.images?.[0] === "string" ? def.product?.images?.[0] : null) ||
      def.product?.image;

    if (existingIdx >= 0) {
      const updated = [...stagedItems];
      const newQty = updated[existingIdx].quantity + qty;
      if (newQty > def.availableDefectiveQuantity) {
        toast.error(`Cannot exceed ${def.availableDefectiveQuantity} available defective units.`);
        return;
      }
      updated[existingIdx].quantity = newQty;
      updated[existingIdx].estimatedCost = estCost;
      updated[existingIdx].notes = selectedItemNote || updated[existingIdx].notes;
      setStagedItems(updated);
    } else {
      setStagedItems((prev) => [
        ...prev,
        {
          source: "defective",
          productId: def.product?._id || def.product,
          defectiveId: def._id,
          productName: def.product?.name || "Product",
          productImage: img,
          defectReason: def.defectReason || "Store Defect",
          availableQty: def.availableDefectiveQuantity,
          quantity: qty,
          estimatedCost: estCost,
          notes: selectedItemNote.trim(),
        },
      ]);
    }

    // Reset selection
    setSelectedDefectiveId("");
    setSelectedDefectiveRecord(null);
    setSelectedQty("1");
    setSelectedEstCost("0");
    setSelectedDefectReason("");
    setSelectedItemNote("");
    toast.success("Added defective stock item to challan.");
  };

  // Quick action: Add all available defective batches to challan
  const handleStageAllDefective = () => {
    if (defectiveItems.length === 0) {
      toast.error("No defective stock batches available.");
      return;
    }

    const newItems: StagedRepairItem[] = defectiveItems
      .filter((def) => def.availableDefectiveQuantity > 0)
      .map((def) => ({
        source: "defective",
        productId: def.product?._id || def.product,
        defectiveId: def._id,
        productName: def.product?.name || "Product",
        productImage: def.product?.images?.[0]?.url,
        defectReason: def.defectReason || "Defective Batch",
        availableQty: def.availableDefectiveQuantity,
        quantity: def.availableDefectiveQuantity,
        estimatedCost: 0,
        notes: "Batch dispatch",
      }));

    setStagedItems((prev) => [...prev, ...newItems]);
    toast.success(`Staged ${newItems.length} defective batches into challan.`);
  };

  const handleRemoveStagedItem = (index: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit dispatch to repair vendor / generate customer challan
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (repairSource === "customer" && !customerName.trim()) {
      toast.error("Please enter the Customer Name.");
      return;
    }
    if (repairSource === "defective" && !vendorName.trim()) {
      toast.error("Please enter the Vendor / Technician name (e.g. Viraj, Poonam).");
      return;
    }
    if (stagedItems.length === 0) {
      toast.error("Please add at least one product item to the repair challan.");
      return;
    }

    setDispatching(true);
    try {
      const res = await fetch("/api/inventory/repairs/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairSource,
          vendorName: vendorName.trim() || (repairSource === "customer" ? "Customer Service" : "Vendor"),
          vendorPhone: vendorPhone.trim(),
          vendorAddress: vendorAddress.trim(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          expectedReturnDate: expectedReturnDate || undefined,
          notes: dispatchNotes.trim(),
          items: stagedItems.map((it) => ({
            productId: it.productId,
            defectiveId: it.defectiveId,
            quantity: it.quantity,
            defectReason: it.defectReason,
            estimatedCost: it.estimatedCost,
            notes: it.notes,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Repair Challan generated successfully!");

        // Open printable BillModal with the generated challan
        if (data.billData) {
          setLastBillData(data.billData);
          setShowBillModal(true);
        }

        // Reset form
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setVendorName("");
        setVendorPhone("");
        setVendorAddress("");
        setExpectedReturnDate("");
        setDispatchNotes("");
        setStagedItems([]);

        // Refresh defective inventory & repair jobs
        fetchDefectiveInventory();
        fetchRepairJobs();
      } else {
        toast.error(data.error || "Failed to dispatch repair.");
      }
    } catch (err: any) {
      console.error("Dispatch error:", err);
      toast.error("Network error while dispatching repair.");
    } finally {
      setDispatching(false);
    }
  };

  // Open complete repair modal
  const handleOpenCompleteModal = (job: any) => {
    setActiveJobToComplete(job);
    setSuccessQty(job.quantity.toString());
    setFailQty("0");
    setActualCost(job.estimatedCost ? (job.estimatedCost * job.quantity).toString() : "0");
    setCompleteNotes("");
    setCompleteModalOpen(true);
  };

  // Submit complete repair
  const handleSubmitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobToComplete) return;

    const sQty = parseInt(successQty, 10);
    const fQty = parseInt(failQty, 10);
    if (isNaN(sQty) || sQty < 0 || isNaN(fQty) || fQty < 0) {
      toast.error("Quantities must be positive whole numbers.");
      return;
    }
    if (sQty + fQty !== activeJobToComplete.quantity) {
      toast.error(
        `Total outcome (${sQty} repaired + ${fQty} failed = ${sQty + fQty}) must equal total job quantity (${activeJobToComplete.quantity}).`
      );
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`/api/inventory/repairs/${activeJobToComplete._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successfulQty: sQty,
          failedQty: fQty,
          actualCost: parseFloat(actualCost) || 0,
          notes: completeNotes.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          data.message ||
            (activeJobToComplete.repairSource === "customer"
              ? "Customer repair marked complete! Handed over to customer."
              : "Repair completed successfully! Stock updated.")
        );
        setCompleteModalOpen(false);
        setActiveJobToComplete(null);
        fetchRepairJobs();
        fetchDefectiveInventory();
      } else {
        toast.error(data.error || "Failed to complete repair.");
      }
    } catch {
      toast.error("Network error while completing repair.");
    } finally {
      setCompleting(false);
    }
  };

  // Reprint / view existing full challan
  const handleReprintJob = async (job: any) => {
    const invNo = job.repairInvoiceNo;
    if (invNo) {
      setReprintingChallanNo(invNo);
      try {
        const res = await fetch(`/api/inventory/repairs/challan/${encodeURIComponent(invNo)}`);
        const data = await res.json();
        if (res.ok && data.success && data.billData) {
          setLastBillData(data.billData);
          setShowBillModal(true);
          setReprintingChallanNo(null);
          return;
        }
      } catch (err) {
        console.error("Error fetching full challan:", err);
      }
      setReprintingChallanNo(null);
    }

    // Fallback if challan endpoint fails
    const billData = {
      invoiceNo: job.repairInvoiceNo || `REP-${job._id.slice(-6).toUpperCase()}`,
      date: new Date(job.startDate || job.createdAt).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      customerName:
        job.repairSource === "customer"
          ? job.customerName || "Customer"
          : job.technicianOrVendor || "Repair Vendor",
      customerPhone: job.repairSource === "customer" ? job.customerPhone : job.vendorPhone,
      customerAddress: job.repairSource === "customer" ? job.customerAddress : job.vendorAddress,
      type: "Repair",
      repairSource: job.repairSource || (job.defectiveInventory ? "defective" : "customer"),
      technicianOrVendor: job.technicianOrVendor || "",
      totalAmount: (job.estimatedCost || 0) * job.quantity,
      products: [
        {
          productName: job.product?.name || "Product",
          quantity: job.quantity,
          salePrice: job.estimatedCost || 0,
          description: `Defect: ${job.defectiveInventory?.defectReason || "Reported Fault"}${
            job.notes ? ` | Note: ${job.notes}` : ""
          }`,
          productImage: job.product?.images?.[0]?.url,
        },
      ],
      notes: job.notes || "",
    };
    setLastBillData(billData);
    setShowBillModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Successfully Repaired":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 size={12} /> Repaired
          </span>
        );
      case "Partially Repaired":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
            <Clock size={12} /> Partially Repaired
          </span>
        );
      case "Failed":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1">
            <AlertTriangle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
            <Clock size={12} /> In Progress
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ─── Header & Top Tabs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Wrench size={22} />
            </div>
            Repair Bill & Vendor Dispatch
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generate official repair invoices / receipts for Customers and vendor dispatch challans for defective stock.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border">
          <button
            type="button"
            onClick={() => setActiveTab("dispatch")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "dispatch"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send size={14} /> New Repair Challan / Bill
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tracking")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "tracking"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={14} /> Repair Records & Tracking ({totalJobs})
          </button>
        </div>
      </div>

      {/* ─── TAB 1: NEW DISPATCH & CHALLAN GENERATOR ─── */}
      {activeTab === "dispatch" && (
        <form onSubmit={handleDispatchSubmit} className="space-y-6">
          {/* Repair Source Toggle Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 bg-card border rounded-3xl shadow-xs">
            <button
              type="button"
              onClick={() => {
                setRepairSource("customer");
                setSelectedDefectiveId("");
                setSelectedDefectiveRecord(null);
                setDefectiveDropdownOpen(false);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                repairSource === "customer"
                  ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                  : "border-transparent hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  repairSource === "customer"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ShoppingBag size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-foreground">
                    1. Customer Product Repair
                  </span>
                  {repairSource === "customer" && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-primary text-primary-foreground">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customer brought their item for repair/service. Generates customer invoice; does NOT alter store inventory.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setRepairSource("defective");
                setSelectedProductId("");
                setSelectedCustomerProduct(null);
                setCatalogDropdownOpen(false);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                repairSource === "defective"
                  ? "bg-amber-500/10 border-amber-500 shadow-xs ring-1 ring-amber-500/30"
                  : "border-transparent hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  repairSource === "defective"
                    ? "bg-amber-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Layers size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-foreground">
                    2. Store Defective Stock Repair
                  </span>
                  {repairSource === "defective" && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-600 text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Our shop defective stock sent to workshop (Viraj, Poonam). Decrements defective stock & restores sellable stock upon receipt.
                </p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Item Selector & Staged Items Table */}
            <div className="lg:col-span-2 space-y-5">
              {/* Product Selector Card */}
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Package size={16} />
                    {repairSource === "customer"
                      ? "Select Customer Product / Device"
                      : "Select Defective Store Inventory"}
                  </h3>
                  {repairSource === "defective" && defectiveItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleStageAllDefective}
                      className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={12} /> Stage All Available Defective ({defectiveItems.length})
                    </button>
                  )}
                </div>

                {/* Customer Repair Mode: Catalog Products Picker */}
                {repairSource === "customer" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <span>Choose Customer Product from Catalog</span>
                          <span className="text-primary">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Total Products in Catalog ({catalogProducts.length})
                        </span>
                      </div>

                      {/* Custom Searchable Dropdown */}
                      <div ref={customerDropdownRef} className="relative">
                        {/* Selected Preview or Trigger */}
                        {selectedCustomerProductDetail ? (
                          <div className="w-full rounded-2xl border-2 border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3 shadow-xs transition-all">
                            <div
                              onClick={handleToggleCustomerDropdown}
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="w-12 h-12 rounded-xl border bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                {selectedCustomerProductDetail.images?.[0]?.url ||
                                (typeof selectedCustomerProductDetail.images?.[0] === "string" ? selectedCustomerProductDetail.images[0] : null) ||
                                selectedCustomerProductDetail.image ? (
                                  <img
                                    src={
                                      selectedCustomerProductDetail.images?.[0]?.url ||
                                      (typeof selectedCustomerProductDetail.images?.[0] === "string" ? selectedCustomerProductDetail.images[0] : null) ||
                                      selectedCustomerProductDetail.image
                                    }
                                    alt={selectedCustomerProductDetail.name || "Product"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ShoppingBag size={22} className="text-primary" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground truncate">
                                    {selectedCustomerProductDetail.name || "Product"}
                                  </span>
                                  {selectedCustomerProductDetail.barcode && (
                                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                                      {selectedCustomerProductDetail.barcode}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                  {selectedCustomerProductDetail.category && (
                                    <span className="font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded-md text-[11px] border border-primary/20">
                                      {typeof selectedCustomerProductDetail.category === "object"
                                        ? selectedCustomerProductDetail.category?.name
                                        : selectedCustomerProductDetail.category}
                                    </span>
                                  )}
                                  <span className="font-semibold text-muted-foreground text-[11px]">
                                    Market Price: <strong className="text-foreground">Rs. {(selectedCustomerProductDetail.price || 0).toLocaleString()}</strong>
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    • Store Inventory: {(selectedCustomerProductDetail.stock ?? 0) > 0 ? `${selectedCustomerProductDetail.stock} units` : "0 in store (Catalog Item)"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={handleToggleCustomerDropdown}
                                className="px-3 py-1.5 rounded-xl border border-primary/30 bg-card hover:bg-primary/10 text-xs font-bold text-primary transition-colors cursor-pointer shadow-2xs"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={handleClearCustomerProductSelection}
                                title="Clear selection"
                                className="p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleToggleCustomerDropdown}
                            className={`w-full rounded-2xl border bg-background px-4 py-3 text-left text-sm flex items-center justify-between shadow-2xs hover:border-primary/50 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer ${
                              catalogDropdownOpen ? "border-primary ring-2 ring-primary/20" : "border-input"
                            }`}
                          >
                            <span className="flex items-center gap-2.5 text-muted-foreground">
                              <ShoppingBag size={18} className="text-primary shrink-0" />
                              <span className="font-medium text-foreground/80">
                                {loadingCatalog
                                  ? "Loading catalog products..."
                                  : "Click to search & select product from catalog..."}
                              </span>
                            </span>
                            <ChevronDown
                              size={16}
                              className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
                                catalogDropdownOpen ? "rotate-180 text-primary" : ""
                              }`}
                            />
                          </button>
                        )}

                        {/* Searchable Dropdown Popover */}
                        {catalogDropdownOpen && (
                          <div
                            className={`absolute z-50 left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden duration-150 ${
                              customerDropdownPlacement === "up"
                                ? "bottom-full mb-2 origin-bottom animate-in fade-in-50 zoom-in-95"
                                : "top-full mt-2 origin-top animate-in fade-in-50 zoom-in-95"
                            }`}
                          >
                            {/* Search Header with Auto-Focus Input */}
                            <div className="p-3 border-b bg-muted/40 space-y-2">
                              <div className="relative flex items-center">
                                <Search size={16} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
                                <input
                                  ref={customerSearchInputRef}
                                  type="text"
                                  placeholder="Search catalog by product name, model, barcode..."
                                  value={catalogSearchQuery}
                                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") setCatalogDropdownOpen(false);
                                  }}
                                  className="w-full bg-background rounded-xl border pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/70"
                                />
                                <div className="absolute right-3 flex items-center gap-1.5">
                                  {isSearchingCatalog && (
                                    <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                                  )}
                                  {catalogSearchQuery && !isSearchingCatalog && (
                                    <button
                                      type="button"
                                      onClick={() => setCatalogSearchQuery("")}
                                      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                                <span>Total catalog items for customer repair:</span>
                                <span className="font-bold text-primary">
                                  {filteredCatalogProducts.length} matching products
                                </span>
                              </div>
                            </div>

                            {/* Catalog Products List */}
                            <div className="max-h-72 overflow-y-auto p-2 space-y-1.5 divide-y divide-border/20">
                              {loadingCatalog ? (
                                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                  <RefreshCw size={14} className="animate-spin text-primary" />
                                  Loading catalog products...
                                </div>
                              ) : filteredCatalogProducts.length === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground px-4">
                                  <ShoppingBag size={24} className="mx-auto mb-2 text-primary/60" />
                                  <p>
                                    No products found matching &quot;<strong>{catalogSearchQuery}</strong>&quot;.
                                  </p>
                                </div>
                              ) : (
                                filteredCatalogProducts.map((p) => {
                                  const isSelected = selectedProductId === p._id;
                                  const imgUrl =
                                    p.images?.[0]?.url ||
                                    (typeof p.images?.[0] === "string" ? p.images[0] : null) ||
                                    p.image;
                                  const catName =
                                    typeof p.category === "object" ? p.category?.name : p.category;

                                  return (
                                    <div
                                      key={p._id}
                                      onClick={() => handleSelectProduct(p)}
                                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                        isSelected
                                          ? "bg-primary/15 border border-primary/40 text-foreground shadow-2xs"
                                          : "hover:bg-muted/70 border border-transparent hover:border-border/50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-150">
                                          {imgUrl ? (
                                            <img
                                              src={imgUrl}
                                              alt={p.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <ShoppingBag
                                              size={18}
                                              className="text-muted-foreground/60 group-hover:text-primary transition-colors"
                                            />
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <div className="font-bold text-xs truncate text-foreground group-hover:text-primary transition-colors">
                                              {p.name}
                                            </div>
                                            {p.barcode && (
                                              <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border shrink-0">
                                                {p.barcode}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                            {catName && (
                                              <span className="inline-flex items-center font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px] border border-primary/20">
                                                {catName}
                                              </span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                              Mkt: <strong className="text-foreground">Rs. {(p.price || 0).toLocaleString()}</strong>
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/80">
                                              • Stock: {(p.stock ?? 0) > 0 ? `${p.stock} in store` : "0 in store (Catalog)"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <div className="text-right hidden sm:block">
                                          <div className="text-xs font-bold text-foreground">
                                            Rs. {(p.price || 0).toLocaleString()}
                                          </div>
                                          <div className="text-[9px] text-muted-foreground">Retail</div>
                                        </div>
                                        {isSelected ? (
                                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                            <Check size={12} />
                                          </span>
                                        ) : (
                                          <span className="w-5 h-5 rounded-full border border-border group-hover:border-primary/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                            <Plus size={10} className="text-muted-foreground group-hover:text-primary" />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Quantity to Repair *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedQty}
                          onChange={(e) => setSelectedQty(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Estimated Repair Charges / Cost (PKR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedEstCost}
                          onChange={(e) => setSelectedEstCost(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="e.g. 1500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Customer Reported Fault / Defect *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Screen flickering, no power, battery drain, motor winding..."
                          value={selectedDefectReason}
                          onChange={(e) => setSelectedDefectReason(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Special Instructions / Serial # / Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Keep original casing, test before delivery, serial #..."
                          value={selectedItemNote}
                          onChange={(e) => setSelectedItemNote(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleStageCustomerItem}
                        variant="primary"
                        className="gap-2 text-xs font-bold cursor-pointer text-white"
                      >
                        <Plus size={14} /> Add Customer Product to Challan
                      </Button>
                    </div>
                  </div>
                )}

                {/* Defective Stock Mode: Defective Inventory Batches */}
                {repairSource === "defective" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <span>Defective Inventory Item to Repair</span>
                          <span className="text-amber-500">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {defectiveItems.filter((d) => (d.availableDefectiveQuantity ?? 0) > 0).length} defective batches available
                        </span>
                      </div>

                      {/* Custom Searchable Dropdown */}
                      <div ref={defectiveDropdownRef} className="relative">
                        {/* Selected Preview or Trigger */}
                        {selectedDefectiveItem ? (
                          <div className="w-full rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-3 flex items-center justify-between gap-3 shadow-xs transition-all">
                            <div
                              onClick={handleToggleDefectiveDropdown}
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="w-12 h-12 rounded-xl border bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                {selectedDefectiveItem.product?.images?.[0]?.url || selectedDefectiveItem.product?.image ? (
                                  <img
                                    src={selectedDefectiveItem.product?.images?.[0]?.url || selectedDefectiveItem.product?.image}
                                    alt={selectedDefectiveItem.product?.name || "Product"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package size={22} className="text-amber-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground truncate">
                                    {selectedDefectiveItem.product?.name || "Product"}
                                  </span>
                                  {selectedDefectiveItem.product?.barcode && (
                                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                                      {selectedDefectiveItem.product.barcode}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                  <span className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md text-[11px] border border-amber-500/20">
                                    Reason: {selectedDefectiveItem.defectReason || "Defective"}
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-foreground">
                                    {selectedDefectiveItem.availableDefectiveQuantity} available in batch
                                  </span>
                                  {selectedDefectiveItem.description && (
                                    <span className="truncate max-w-[200px] text-[11px] text-muted-foreground">
                                      • {selectedDefectiveItem.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={handleToggleDefectiveDropdown}
                                className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-card hover:bg-amber-500/10 text-xs font-bold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer shadow-2xs"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={handleClearDefectiveSelection}
                                title="Clear selection"
                                className="p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleToggleDefectiveDropdown}
                            className={`w-full rounded-2xl border bg-background px-4 py-3 text-left text-sm flex items-center justify-between shadow-2xs hover:border-amber-500/50 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all cursor-pointer ${
                              defectiveDropdownOpen ? "border-amber-500 ring-2 ring-amber-500/20" : "border-input"
                            }`}
                          >
                            <span className="flex items-center gap-2.5 text-muted-foreground">
                              <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                              <span className="font-medium text-foreground/80">
                                {loadingDefective ? "Loading defective inventory..." : "Click to search & select defective inventory item..."}
                              </span>
                            </span>
                            <ChevronDown
                              size={16}
                              className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
                                defectiveDropdownOpen ? "rotate-180 text-amber-500" : ""
                              }`}
                            />
                          </button>
                        )}

                        {/* Searchable Dropdown Popover */}
                        {defectiveDropdownOpen && (
                          <div
                            className={`absolute z-50 left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden duration-150 ${
                              defectiveDropdownPlacement === "up"
                                ? "bottom-full mb-2 origin-bottom animate-in fade-in-50 zoom-in-95"
                                : "top-full mt-2 origin-top animate-in fade-in-50 zoom-in-95"
                            }`}
                          >
                            {/* Search Header with Auto-Focus Input */}
                            <div className="p-3 border-b bg-muted/40 space-y-2">
                              <div className="relative flex items-center">
                                <Search size={16} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
                                <input
                                  ref={defectiveSearchInputRef}
                                  type="text"
                                  placeholder="Search defective items by product name, barcode, defect reason..."
                                  value={defectiveSearchQuery}
                                  onChange={(e) => setDefectiveSearchQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") setDefectiveDropdownOpen(false);
                                  }}
                                  className="w-full bg-background rounded-xl border pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-muted-foreground/70"
                                />
                                <div className="absolute right-3 flex items-center gap-1.5">
                                  {isSearchingDefective && (
                                    <Loader2 size={16} className="animate-spin text-amber-500 shrink-0" />
                                  )}
                                  {defectiveSearchQuery && !isSearchingDefective && (
                                    <button
                                      type="button"
                                      onClick={() => setDefectiveSearchQuery("")}
                                      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                                <span>Defective inventory items for repair:</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {filteredDefectiveItems.length} matching items
                                </span>
                              </div>
                            </div>

                            {/* Defective Items List */}
                            <div className="max-h-64 overflow-y-auto p-2 space-y-1.5 divide-y divide-border/20">
                              {loadingDefective ? (
                                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                  <RefreshCw size={14} className="animate-spin text-amber-500" />
                                  Loading defective inventory...
                                </div>
                              ) : filteredDefectiveItems.length === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground px-4">
                                  <AlertTriangle size={24} className="mx-auto mb-2 text-amber-500/60" />
                                  {defectiveItems.length === 0 ? (
                                    <p className="font-medium">No defective inventory items with available stock found in system.</p>
                                  ) : (
                                    <p>
                                      No defective items match &quot;<strong>{defectiveSearchQuery}</strong>&quot;.
                                    </p>
                                  )}
                                </div>
                              ) : (
                                filteredDefectiveItems.map((def) => {
                                  const isSelected = selectedDefectiveId === def._id;
                                  const prod = def.product;
                                  const prodName = prod?.name || "Product";
                                  const imgUrl =
                                    prod?.images?.[0]?.url ||
                                    (typeof prod?.images?.[0] === "string" ? prod?.images[0] : null) ||
                                    prod?.image;
                                  const availQty = def.availableDefectiveQuantity;
                                  const reason = def.defectReason || "Defective";
                                  const desc = def.description;
                                  const catName =
                                    typeof prod?.category === "object" ? prod?.category?.name : prod?.category;

                                  return (
                                    <div
                                      key={def._id}
                                      onClick={() => handleSelectDefective(def)}
                                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                        isSelected
                                          ? "bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-2xs"
                                          : "hover:bg-muted/70 border border-transparent hover:border-amber-500/20"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-150">
                                          {imgUrl ? (
                                            <img src={imgUrl} alt={prodName} className="w-full h-full object-cover" />
                                          ) : (
                                            <Package size={18} className="text-muted-foreground/60 group-hover:text-amber-600 transition-colors" />
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <div className="font-bold text-xs truncate text-foreground group-hover:text-amber-600 transition-colors">
                                              {prodName}
                                            </div>
                                            {prod?.barcode && (
                                              <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border shrink-0">
                                                {prod.barcode}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/20">
                                              Reason: {reason}
                                            </span>
                                            {catName && (
                                              <span className="inline-flex items-center text-muted-foreground text-[10px]">
                                                ({catName})
                                              </span>
                                            )}
                                            {desc && (
                                              <span className="truncate max-w-[200px] text-[10px] text-muted-foreground/80">
                                                • {desc}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                          {availQty} avail
                                        </span>
                                        {isSelected ? (
                                          <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                                            <Check size={12} />
                                          </span>
                                        ) : (
                                          <span className="w-5 h-5 rounded-full border border-border group-hover:border-amber-500/50 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors">
                                            <Plus size={10} className="text-muted-foreground group-hover:text-amber-600" />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-muted-foreground block">
                            Quantity to Send *
                          </label>
                          {selectedDefectiveItem && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              Max: {selectedDefectiveItem.availableDefectiveQuantity} units
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          min="1"
                          max={selectedDefectiveItem ? selectedDefectiveItem.availableDefectiveQuantity : undefined}
                          value={selectedQty}
                          onChange={(e) => setSelectedQty(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Estimated Repair Cost / Unit (PKR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedEstCost}
                          onChange={(e) => setSelectedEstCost(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500/40"
                          placeholder="e.g. 500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Specific Fault / Workshop Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Check capacitor, replace display IC, check coil..."
                          value={selectedItemNote}
                          onChange={(e) => setSelectedItemNote(e.target.value)}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleStageDefectiveItem}
                        variant="outline"
                        className="gap-2 text-xs font-bold cursor-pointer border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                      >
                        <Plus size={14} /> Add Defective Item To Challan
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Staged Items Table */}
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText size={16} /> 2. Items in This Repair Challan ({stagedItems.length})
                  </h3>
                  {stagedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStagedItems([])}
                      className="text-[11px] text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {stagedItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-2xl border-dashed">
                    <Package size={28} className="mx-auto opacity-30 mb-1.5" />
                    No items added yet. Select a product above and click &quot;Add to Challan&quot;.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                          <th className="p-3">Type</th>
                          <th className="p-3">Product</th>
                          <th className="p-3">Reported Fault</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Est. Unit Rate</th>
                          <th className="p-3 text-right">Subtotal</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stagedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.source === "customer"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-amber-500/10 text-amber-600"
                                }`}
                              >
                                {item.source === "customer" ? "Customer" : "Store Defective"}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.productImage ? (
                                    <img
                                      src={item.productImage}
                                      alt={item.productName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package size={14} className="text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate max-w-[180px]">{item.productName}</p>
                                  {item.notes && (
                                    <p className="text-[10px] text-muted-foreground italic truncate">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              <span className="px-2 py-0.5 rounded bg-muted font-bold text-[10px]">
                                {item.defectReason}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold font-mono text-sm">
                              {item.quantity}
                            </td>
                            <td className="p-3 text-right font-mono">
                              PKR {item.estimatedCost.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              PKR {(item.estimatedCost * item.quantity).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStagedItem(idx)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Parties & Dispatch Summary */}
            <div className="space-y-5">
              <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <User size={16} /> 3. Challan & Party Details
                </h3>

                {/* Customer Details (Customer Repair) */}
                {repairSource === "customer" && (
                  <div className="space-y-3 pb-3 border-b">
                    <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                      Customer Information:
                    </span>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ahmed Khan, Bilal..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Customer Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +92 300 1234567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Customer Address / City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Clifton, Karachi"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                )}

                {/* Vendor / Workshop Details */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    {repairSource === "customer"
                      ? "Assigned Technician / Workshop (Optional):"
                      : "Repair Vendor / Technician Details:"}
                  </span>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      {repairSource === "customer"
                        ? "Technician / Workshop Name"
                        : "Vendor / Technician Name *"}
                    </label>
                    <input
                      type="text"
                      required={repairSource === "defective"}
                      placeholder="e.g. Viraj, Poonam, Internal Workshop"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    {/* Quick vendor chips */}
                    {vendorsList.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-bold">Recent:</span>
                        {vendorsList.slice(0, 4).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVendorName(v)}
                            className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Workshop Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +92 333 1234567"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  {repairSource === "defective" && (
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Workshop Address / Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shop #12, Shershah Market"
                        value={vendorAddress}
                        onChange={(e) => setVendorAddress(e.target.value)}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Expected Return / Delivery Date
                    </label>
                    <input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Challan Terms / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Additional terms or instructions..."
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total Units In Challan:</span>
                    <strong className="text-foreground text-sm font-mono">
                      {stagedItems.reduce((acc, it) => acc + it.quantity, 0)} units
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Est. Total Charges:</span>
                    <strong className="text-primary text-base font-black font-mono">
                      PKR{" "}
                      {stagedItems
                        .reduce((acc, it) => acc + it.quantity * it.estimatedCost, 0)
                        .toLocaleString()}
                    </strong>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={dispatching || stagedItems.length === 0}
                    className="w-full gap-2 py-3 font-black text-sm tracking-wide cursor-pointer text-white shadow-lg"
                  >
                    {dispatching ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Printer size={16} />
                    )}
                    {dispatching
                      ? "Generating Challan..."
                      : "Generate Repair Invoice & Dispatch"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ─── TAB 2: DISPATCHED TRACKING & RECORDS ─── */}
      {activeTab === "tracking" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-3xl border shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                className="w-full rounded-xl border bg-background pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Search Challan #, Customer, Vendor, Product..."
                value={searchTracking}
                onChange={(e) => {
                  setSearchTracking(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Source Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">Source:</span>
                <select
                  value={selectedSourceFilter}
                  onChange={(e) => {
                    setSelectedSourceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="All">All Sources</option>
                  <option value="customer">Customer Repairs</option>
                  <option value="defective">Store Defective</option>
                </select>
              </div>

              {/* Vendor Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">Vendor:</span>
                <select
                  value={selectedVendorFilter}
                  onChange={(e) => {
                    setSelectedVendorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="All">All Vendors</option>
                  {vendorsList.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => {
                    setSelectedStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Successfully Repaired">Successfully Repaired</option>
                  <option value="Partially Repaired">Partially Repaired</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={fetchRepairJobs}
                className="p-2 h-9 w-9 cursor-pointer"
                title="Refresh Records"
              >
                <RefreshCw size={15} className={loadingJobs ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-card border rounded-3xl shadow-xs overflow-hidden">
            {loadingJobs && repairJobs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-primary" />
                Loading dispatched repair jobs...
              </div>
            ) : repairJobs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm border-dashed">
                <Wrench size={32} className="mx-auto opacity-30 mb-2" />
                No dispatched repair records found matching the filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Challan / Inv #</th>
                      <th className="p-3.5">Source</th>
                      <th className="p-3.5">Customer / Vendor</th>
                      <th className="p-3.5">Product & Defect</th>
                      <th className="p-3.5 text-center">Qty Sent</th>
                      <th className="p-3.5 text-center">Repaired / Failed</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Dispatch Date</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {repairJobs.map((job) => {
                      const prodName = job.product?.name || "Product";
                      const isCustomer = job.repairSource === "customer";
                      return (
                        <tr key={job._id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-foreground">
                            {job.repairInvoiceNo || `REP-${job._id.slice(-6).toUpperCase()}`}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCustomer
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {isCustomer ? "Customer Repair" : "Store Defective"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {isCustomer ? (
                              <div>
                                <div className="font-bold text-foreground">
                                  {job.customerName || "Customer"}
                                </div>
                                {job.customerPhone && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Phone size={10} /> {job.customerPhone}
                                  </div>
                                )}
                                {job.technicianOrVendor && (
                                  <div className="text-[10px] text-primary font-semibold">
                                    Tech: {job.technicianOrVendor}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-foreground">
                                  {job.technicianOrVendor}
                                </div>
                                {job.vendorPhone && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Phone size={10} /> {job.vendorPhone}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-foreground max-w-[180px] truncate">
                              {prodName}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                              Defect: {job.defectiveInventory?.defectReason || job.notes || "Reported Fault"}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-sm">
                            {job.quantity}
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            <span className="text-emerald-600 font-bold">+{job.quantityRepaired || 0}</span> /{" "}
                            <span className="text-red-500 font-bold">-{job.quantityFailed || 0}</span>
                          </td>
                          <td className="p-3.5">{getStatusBadge(job.status)}</td>
                          <td className="p-3.5 text-muted-foreground text-[11px]">
                            {new Date(job.startDate || job.createdAt).toLocaleDateString("en-PK", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {job.expectedReturnDate && (
                              <div className="text-[10px] text-amber-600 font-bold">
                                Return by: {new Date(job.expectedReturnDate).toLocaleDateString("en-PK", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reprintingChallanNo === job.repairInvoiceNo}
                                onClick={() => handleReprintJob(job)}
                                className="h-7 text-[11px] gap-1 px-2.5 font-bold cursor-pointer"
                                title="Print / Download Full Challan"
                              >
                                {reprintingChallanNo === job.repairInvoiceNo ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Printer size={12} />
                                )}
                                Print Challan
                              </Button>

                              {job.status === "In Progress" && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleOpenCompleteModal(job)}
                                  className="h-7 text-[11px] gap-1 px-2.5 font-bold cursor-pointer text-white"
                                  title={isCustomer ? "Hand over to customer" : "Receive repaired stock"}
                                >
                                  <CheckCircle2 size={12} /> {isCustomer ? "Complete" : "Receive Stock"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t text-xs">
                <span className="text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalJobs} records)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: RECEIVE REPAIRED STOCK / COMPLETE REPAIR ─── */}
      {completeModalOpen && activeJobToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {activeJobToComplete.repairSource === "customer"
                      ? "Complete Customer Repair"
                      : "Receive Repaired Stock"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeJobToComplete.repairSource === "customer" ? "Customer: " : "Vendor: "}
                    <strong className="text-foreground">
                      {activeJobToComplete.repairSource === "customer"
                        ? activeJobToComplete.customerName || "Customer"
                        : activeJobToComplete.technicianOrVendor}
                    </strong>{" "}
                    (Total {activeJobToComplete.quantity} units)
                  </p>
                </div>
              </div>
            </div>

            {/* Informational Banner */}
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                activeJobToComplete.repairSource === "customer"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              <Info size={16} className="shrink-0 mt-0.5" />
              <div>
                {activeJobToComplete.repairSource === "customer" ? (
                  <span>
                    <strong>Customer Repair Flow:</strong> Successfully repaired items are returned to the customer. Warehouse stock will <strong>not</strong> be increased.
                  </span>
                ) : (
                  <span>
                    <strong>Store Defective Flow:</strong> Successfully repaired items will be added back to <strong>Sellable Store Stock</strong>. Failed items will return to Defective Inventory.
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitComplete} className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-2xl text-xs space-y-1">
                <p>
                  <strong>Product:</strong> {activeJobToComplete.product?.name || "Product"}
                </p>
                <p>
                  <strong>Challan #:</strong> {activeJobToComplete.repairInvoiceNo}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-emerald-600 block mb-1">
                    Successfully Repaired *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeJobToComplete.quantity}
                    value={successQty}
                    onChange={(e) => setSuccessQty(e.target.value)}
                    className="w-full rounded-xl border border-emerald-500/30 bg-background px-3 py-2 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {activeJobToComplete.repairSource === "customer"
                      ? "Ready for customer pickup"
                      : "Will return to sellable stock"}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-red-600 block mb-1">
                    Failed / Unrepairable *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeJobToComplete.quantity}
                    value={failQty}
                    onChange={(e) => setFailQty(e.target.value)}
                    className="w-full rounded-xl border border-red-500/30 bg-background px-3 py-2 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {activeJobToComplete.repairSource === "customer"
                      ? "Returned unrepairable"
                      : "Will return to defective stock"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Actual Cost / Repair Charges Paid (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Completion Notes / Outcome
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Parts replaced, tested OK under load, customer notified..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompleteModalOpen(false)}
                  className="text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={completing}
                  className="text-xs font-bold gap-1 text-white cursor-pointer"
                >
                  {completing && <RefreshCw size={14} className="animate-spin" />}
                  {completing ? "Saving..." : "Confirm & Complete"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: PRINTABLE REPAIR BILL / CHALLAN MODAL ─── */}
      {showBillModal && lastBillData && (
        <BillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          billData={lastBillData}
        />
      )}
    </div>
  );
};

export default RepairBillContent;
