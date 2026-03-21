"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import toast from "@/utils/toast";

export interface InvoiceItem {
  _id: string;
  product: any;
  category: any;
  quantity: number;
  salePrice: number;
  description: string;
  soldBy: any;
  createdAt: string;
}

interface InvoiceContextType {
  invoices: InvoiceItem[];
  loading: boolean;
  fetchInvoices: (filters?: {
    product?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  createInvoice: (data: {
    productId: string;
    quantity: number;
    salePrice: number;
    description: string;
  }) => Promise<boolean>;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider = ({ children }: { children: React.ReactNode }) => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async (filters: { product?: string; category?: string; startDate?: string; endDate?: string } = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.product) qs.append("product", filters.product);
      if (filters.category) qs.append("category", filters.category);
      if (filters.startDate) qs.append("startDate", filters.startDate);
      if (filters.endDate) qs.append("endDate", filters.endDate);

      const res = await fetch(`/api/invoices?${qs.toString()}`);
      if (res.ok) {
        setInvoices(await res.json());
      } else {
        toast.error("Failed to fetch invoices");
      }
    } catch {
      toast.error("Network error fetching invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvoice = async (data: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Invoice created successfully & stock updated!");
        return true;
      }
      toast.error(json.error || "Failed to create invoice");
      return false;
    } catch {
      toast.error("Network error creating invoice");
      return false;
    }
  };

  return (
    <InvoiceContext.Provider
      value={{ invoices, loading, fetchInvoices, createInvoice }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoices = () => {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error("useInvoices must be used within an InvoiceProvider");
  return ctx;
};
