// context/InvoiceContext.tsx

"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import toast from "@/utils/toast";

export interface InvoiceProductItem {
  product: any;
  category: any;
  quantity: number;
  salePrice: number;
  description: string;
  _id?: string;
}

export interface InvoiceItem {
  _id: string;
  invoiceNo?: string;
  product?: any;
  category?: any;
  quantity?: number;
  salePrice?: number;
  totalAmount: number;
  description?: string;
  products: InvoiceProductItem[];
  soldBy: any;
  createdAt: string;
  updatedAt?: string;
}

interface InvoiceContextType {
  invoices: InvoiceItem[];
  totalInvoices: number;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  fetchInvoices: (
    page?: number,
    search?: string,
    filters?: {
      product?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    },
  ) => Promise<void>;
  createInvoice: (data: {
    productId?: string;
    quantity?: number;
    salePrice?: number;
    description?: string;
    products?: {
      productId: string;
      quantity: number;
      salePrice: number;
      description: string;
    }[];
  }) => Promise<boolean>;
  getInvoiceById: (id: string) => Promise<InvoiceItem | null>;
  deleteInvoice: (id: string) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInvoices = useCallback(
    async (
      page: number = 1,
      search: string = "",
      filters: {
        product?: string;
        category?: string;
        startDate?: string;
        endDate?: string;
      } = {},
    ) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", "10");

        if (search) {
          queryParams.append("search", search);
        }
        if (filters.product) {
          queryParams.append("product", filters.product);
        }
        if (filters.category) {
          queryParams.append("category", filters.category);
        }
        if (filters.startDate) {
          queryParams.append("startDate", filters.startDate);
        }
        if (filters.endDate) {
          queryParams.append("endDate", filters.endDate);
        }

        const res = await fetch(`/api/invoices?${queryParams.toString()}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setInvoices(data.invoices || []);
          setTotalInvoices(data.totalInvoices || 0);
          setCurrentPage(data.currentPage || page);
          setTotalPages(data.totalPages || 1);
        } else {
          toast.error(data.error || "Failed to fetch invoices");
          setError(data.error || "Failed to fetch invoices");
        }
      } catch (err: any) {
        console.error("Fetch invoices error:", err);
        toast.error("Network error fetching invoices");
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createInvoice = async (data: {
    productId?: string;
    quantity?: number;
    salePrice?: number;
    description?: string;
    products?: {
      productId: string;
      quantity: number;
      salePrice: number;
      description: string;
    }[];
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.ok) {
        toast.success("Invoice created successfully & stock updated!");
        // Refresh invoices after creating
        await fetchInvoices(1, searchQuery);
        return true;
      }

      toast.error(json.error || json.message || "Failed to create invoice");
      return false;
    } catch (err: any) {
      toast.error("Network error creating invoice");
      return false;
    }
  };

  const getInvoiceById = useCallback(
    async (id: string): Promise<InvoiceItem | null> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/invoices/${id}`);
        const data = await res.json();

        if (res.ok) {
          return data.invoice || data;
        } else {
          toast.error(data.message || "Failed to fetch invoice");
          return null;
        }
      } catch (err: any) {
        toast.error("Network error fetching invoice");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteInvoice = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          method: "DELETE",
        });

        const data = await res.json();

        if (res.ok) {
          toast.success("Invoice deleted successfully");
          // Refresh current page after deletion
          await fetchInvoices(currentPage, searchQuery);
        } else {
          toast.error(data.message || "Failed to delete invoice");
        }
      } catch (err: any) {
        toast.error("Network error deleting invoice");
      }
    },
    [currentPage, searchQuery, fetchInvoices],
  );

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        totalInvoices,
        currentPage,
        totalPages,
        loading,
        error,
        searchQuery,
        fetchInvoices,
        createInvoice,
        getInvoiceById,
        deleteInvoice,
        setCurrentPage,
        setSearchQuery,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoices = () => {
  const ctx = useContext(InvoiceContext);
  if (!ctx)
    throw new Error("useInvoices must be used within an InvoiceProvider");
  return ctx;
};
