"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "@/components/ui/Toast";

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: any[];
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  createOrder: (orderData: any) => Promise<any>;
  updateOrder: (id: string, updateData: any) => Promise<boolean>;
  cancelOrder: (id: string) => Promise<boolean>;
  deleteOrder: (id: string) => Promise<boolean>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setOrders([]);
      setLoading(false);
    }
  }, [user]);

  const createOrder = async (orderData: any) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");
      
      await fetchOrders(); // refresh
      return data.order;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateOrder = async (id: string, updateData: any) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update order");
      }
      toast.success("Order updated successfully");
      await fetchOrders();
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  const cancelOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel order");
      }
      toast.success("Order cancelled successfully");
      await fetchOrders();
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete order");
      }
      toast.success("Order deleted successfully");
      await fetchOrders();
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  return (
    <OrderContext.Provider value={{ orders, loading, error, fetchOrders, createOrder, updateOrder, cancelOrder, deleteOrder }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
};
