"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "@/components/ui/Toast";

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string | { _id: string; name: string };
  images: { url: string; publicId: string }[];
  createdAt?: string;
  updatedAt?: string;
}

// Define MediaItem interface
export interface MediaItem {
  url: string;
  publicId: string;
  file?: File;
}

interface ProductContextType {
  products: Product[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string;
  stockFilter: string;
  setStockFilter: (filter: string) => void;
  fetchProducts: (
    page?: number,
    search?: string,
    category?: string,
    stock?: string,
  ) => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  addProduct: (data: any) => Promise<boolean>;
  editProduct: (id: string, data: any) => Promise<boolean>;
  refresh: () => Promise<void>;
  uploadMedia: (
    file: string,
    resourceType: "image" | "video",
  ) => Promise<MediaItem | null>;
  deleteMedia: (publicId: string, resourceType: "image" | "video") => Promise<boolean>;
  setCurrentPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  const fetchProducts = useCallback(
    async (page: number = 1, search: string = "", category: string = "All", stock: string = "All") => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", "10");

        if (search) {
          queryParams.append("search", search);
        }
        if (category && category !== "All") {
          queryParams.append("category", category);
        }
        if (stock && stock !== "All") {
          queryParams.append("stock", stock);
        }

        const res = await fetch(`/api/products?${queryParams}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load products");
        }

        setProducts(data.products || []);
        setTotalProducts(data.totalProducts || 0);
        setCurrentPage(data.currentPage || page);
        setTotalPages(data.totalPages || 1);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchProductById = useCallback(
    async (id: string): Promise<Product | null> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch product");
        }

        return data.product || data;
      } catch (err: any) {
        toast.error(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const addProduct = async (data: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      
      if (res.ok) {
        toast.success("Product created successfully!");
        await fetchProducts(1, "", "All");
        return true;
      }
      
      toast.error(json.error || json.message || "Failed to create product");
      return false;
    } catch (error: any) {
      console.error("Add product error:", error);
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
        toast.success("Product updated successfully!");
        await fetchProducts(currentPage, searchQuery, selectedCategory);
        return true;
      }
      
      toast.error(json.error || json.message || "Failed to update product");
      return false;
    } catch (error: any) {
      console.error("Edit product error:", error);
      toast.error("Network error updating product");
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, { 
        method: "DELETE" 
      });
      
      const json = await res.json();
      
      if (res.ok) {
        toast.success("Product deleted successfully!");
        await fetchProducts(currentPage, searchQuery, selectedCategory);
        return true;
      }
      
      toast.error(json.error || json.message || "Failed to delete product");
      return false;
    } catch (error: any) {
      console.error("Delete product error:", error);
      toast.error("Network error deleting product");
      return false;
    }
  };

  const uploadMedia = useCallback(
    async (
      file: string,
      resourceType: "image" | "video",
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
        
        const error = await res.json();
        toast.error(error.message || "Upload failed");
        return null;
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Network error during upload");
        return null;
      }
    },
    [],
  );

  const deleteMedia = async (
    publicId: string,
    resourceType: "image" | "video",
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, resourceType }),
      });
      
      if (res.ok) {
        toast.success("Media deleted successfully");
        return true;
      }
      
      toast.error("Failed to delete media");
      return false;
    } catch (error) {
      console.error("Delete media error:", error);
      toast.error("Network error deleting media");
      return false;
    }
  };

  const refresh = useCallback(async () => {
    await fetchProducts(currentPage, searchQuery, selectedCategory, stockFilter);
  }, [fetchProducts, currentPage, searchQuery, selectedCategory, stockFilter]);

  return (
    <ProductContext.Provider
      value={{
        products,
        totalProducts,
        currentPage,
        totalPages,
        loading,
        error,
        searchQuery,
        selectedCategory,
        stockFilter,
        fetchProducts,
        fetchProductById,
        deleteProduct,
        addProduct,
        editProduct,
        refresh,
        uploadMedia,
        deleteMedia,
        setCurrentPage,
        setSearchQuery,
        setSelectedCategory,
        setStockFilter,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};