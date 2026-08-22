"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { toast } from "@/components/ui/Toast";

export interface CreditSaleItem {
  _id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerNote?: string;
  products: {
    product: any;
    category: any;
    quantity: number;
    salePrice: number;
    description?: string;
    _id?: string;
  }[];
  totalAmount: number;
  payments?: {
    amount: number;
    remainingAmount: number;
    receivedAt: string;
    receivedBy?: any;
  }[];
  paidAmount?: number;
  remainingAmount?: number;
  status?: "Open" | "Paid" | "Reverted";
  stockRestored?: boolean;
  generatedInvoice?: any;
  createdBy: any;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCreditSalePayload {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerNote?: string;
  products: {
    productId: string;
    quantity: number;
    salePrice: number;
    description: string;
  }[];
}

interface CreditSaleContextType {
  creditSales: CreditSaleItem[];
  totalCreditSales: number;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  searchQuery: string;
  fetchCreditSales: (
    page?: number,
    search?: string,
    filters?: {
      product?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => Promise<void>;
  createCreditSale: (
    data: CreateCreditSalePayload
  ) => Promise<CreditSaleItem | null>;
  addCreditPayment: (id: string, amount: number) => Promise<CreditSaleItem | null>;
  revertCreditSale: (id: string) => Promise<CreditSaleItem | null>;
  deleteCreditSale: (id: string) => Promise<boolean>;
  setCurrentPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
}

const CreditSaleContext = createContext<CreditSaleContextType | undefined>(
  undefined
);

export const CreditSaleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [creditSales, setCreditSales] = useState<CreditSaleItem[]>([]);
  const [totalCreditSales, setTotalCreditSales] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCreditSales = useCallback(
    async (
      page: number = 1,
      search: string = "",
      filters: {
        product?: string;
        category?: string;
        startDate?: string;
        endDate?: string;
      } = {}
    ) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", "10");
        if (search) queryParams.append("search", search);
        if (filters.product) queryParams.append("product", filters.product);
        if (filters.category) queryParams.append("category", filters.category);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);

        const res = await fetch(`/api/credit-sales?${queryParams.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to fetch credit sales");
        }

        setCreditSales(data.creditSales || []);
        setTotalCreditSales(data.totalCreditSales || 0);
        setCurrentPage(data.currentPage || page);
        setTotalPages(data.totalPages || 1);
      } catch (err: any) {
        toast.error(err.message || "Network error fetching credit sales");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createCreditSale = async (data: CreateCreditSalePayload) => {
    try {
      const res = await fetch("/api/credit-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save credit sale");
      }

      toast.success("Credit sale saved successfully");
      await fetchCreditSales(1, searchQuery);
      return json.creditSale as CreditSaleItem;
    } catch (err: any) {
      toast.error(err.message || "Network error saving credit sale");
      return null;
    }
  };

  const addCreditPayment = async (id: string, amount: number) => {
    try {
      const res = await fetch(`/api/credit-sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment", amount }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to add payment");
      }

      toast.success("Payment added successfully");
      await fetchCreditSales(currentPage, searchQuery);
      return json.creditSale as CreditSaleItem;
    } catch (err: any) {
      toast.error(err.message || "Network error adding payment");
      return null;
    }
  };

  const revertCreditSale = async (id: string) => {
    try {
      const res = await fetch(`/api/credit-sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert" }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to revert credit sale");
      }

      toast.success("Credit sale reverted and stock restored");
      await fetchCreditSales(currentPage, searchQuery);
      return json.creditSale as CreditSaleItem;
    } catch (err: any) {
      toast.error(err.message || "Network error reverting credit sale");
      return null;
    }
  };

  const deleteCreditSale = async (id: string) => {
    try {
      const res = await fetch(`/api/credit-sales/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete credit sale");
      }

      toast.success("Credit sale deleted and stock restored");
      await fetchCreditSales(currentPage, searchQuery);
      return true;
    } catch (err: any) {
      toast.error(err.message || "Network error deleting credit sale");
      return false;
    }
  };

  return (
    <CreditSaleContext.Provider
      value={{
        creditSales,
        totalCreditSales,
        currentPage,
        totalPages,
        loading,
        searchQuery,
        fetchCreditSales,
        createCreditSale,
        addCreditPayment,
        revertCreditSale,
        deleteCreditSale,
        setCurrentPage,
        setSearchQuery,
      }}
    >
      {children}
    </CreditSaleContext.Provider>
  );
};

export const useCreditSales = () => {
  const ctx = useContext(CreditSaleContext);
  if (!ctx) {
    throw new Error("useCreditSales must be used within a CreditSaleProvider");
  }
  return ctx;
};
