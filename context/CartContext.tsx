"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "@/utils/toast";

interface CartItem {
  product: any;
  quantity: number;
}

interface CartContextType {
  cart: any;
  loading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (res.ok) setCart(data);
    } catch (e) {
      console.error("Cart fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addToCart = async (productId: string, quantity: number) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart(data.cart);
        toast.success("Added to cart");
      } else {
        toast.error(data.error || "Failed to add to cart");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!cart) return;
    const newItems = cart.items.map((item: any) => 
      (item.product._id || item.product) === productId ? { ...item, quantity } : item
    );
    try {
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });
      if (res.ok) {
        setCart({ ...cart, items: newItems });
      }
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!cart) return;
    const newItems = cart.items.filter((item: any) => (item.product._id || item.product) !== productId);
    try {
        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: newItems }),
        });
        if (res.ok) {
          setCart({ ...cart, items: newItems });
          toast.success("Removed from cart");
        }
      } catch (e) {
        toast.error("Delete failed");
      }
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeFromCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
