"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import toast from "@/utils/toast";

export interface MediaItem {
  url: string;
  publicId: string;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  images: MediaItem[];
  videos: MediaItem[];
  category: any;
  stock: number;
  attributes?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductContextType {
  products: Product[];
  loading: boolean;
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  addProduct: (data: any) => Promise<boolean>;
  editProduct: (id: string, data: any) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  uploadMedia: (
    file: string,
    resourceType: "image" | "video"
  ) => Promise<MediaItem | null>;
  deleteMedia: (
    publicId: string,
    resourceType: "image" | "video"
  ) => Promise<boolean>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        setProducts(await res.json());
      } else {
        toast.error("Failed to load products");
      }
    } catch {
      toast.error("Network error loading products");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductById = async (id: string): Promise<Product | null> => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  };

  const addProduct = async (data: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Product created!");
        await fetchProducts();
        return true;
      }
      toast.error(json.error || "Failed to create product");
      return false;
    } catch {
      toast.error("Network error creating product");
      return false;
    }
  };

  const editProduct = async (id: string, data: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Product updated!");
        await fetchProducts();
        return true;
      }
      toast.error(json.error || "Failed to update product");
      return false;
    } catch {
      toast.error("Network error updating product");
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Product deleted!");
        await fetchProducts();
        return true;
      }
      toast.error(json.error || "Failed to delete product");
      return false;
    } catch {
      toast.error("Network error deleting product");
      return false;
    }
  };

  const uploadMedia = async (
    file: string,
    resourceType: "image" | "video"
  ): Promise<MediaItem | null> => {
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file,
          folder: "ecom/products",
          resourceType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { url: data.url, publicId: data.publicId };
      }
      toast.error("Upload failed");
      return null;
    } catch {
      toast.error("Network error during upload");
      return null;
    }
  };

  const deleteMedia = async (
    publicId: string,
    resourceType: "image" | "video"
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, resourceType }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        fetchProducts,
        fetchProductById,
        addProduct,
        editProduct,
        deleteProduct,
        refresh: fetchProducts,
        uploadMedia,
        deleteMedia,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx)
    throw new Error("useProducts must be used within a ProductProvider");
  return ctx;
};
