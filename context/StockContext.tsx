"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import toast from "@/utils/toast";

export interface StockLogEntry {
  _id: string;
  product: string;
  change: number;
  description: string;
  resultingStock: number;
  performedBy?: { name: string; email: string };
  createdAt: string;
}

interface StockContextType {
  logs: StockLogEntry[];
  loading: boolean;
  fetchLogs: (productId: string) => Promise<void>;
  addStockChange: (
    productId: string,
    change: number,
    description: string
  ) => Promise<boolean>;
  deleteAllLogs: (productId: string) => Promise<boolean>;
  refresh: (productId: string) => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [logs, setLogs] = useState<StockLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (productId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/${productId}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch {
      toast.error("Failed to load stock logs");
    } finally {
      setLoading(false);
    }
  }, []);

  const addStockChange = async (
    productId: string,
    change: number,
    description: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, change, description }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(
          `Stock ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change)}`
        );
        await fetchLogs(productId);
        return true;
      }
      toast.error(json.error || "Failed to update stock");
      return false;
    } catch {
      toast.error("Network error updating stock");
      return false;
    }
  };

  const deleteAllLogs = async (productId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/stock/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Stock logs cleared");
        setLogs([]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <StockContext.Provider
      value={{
        logs,
        loading,
        fetchLogs,
        addStockChange,
        deleteAllLogs,
        refresh: fetchLogs,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used within a StockProvider");
  return ctx;
};
