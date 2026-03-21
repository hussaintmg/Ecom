"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import toast from "@/utils/toast";

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
}

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (data: { name: string; description?: string; image?: string }) => Promise<boolean>;
  editCategory: (id: string, data: { name: string; description?: string; image?: string }) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        toast.error("Failed to load categories");
      }
    } catch {
      toast.error("Network error loading categories");
    } finally {
      setLoading(false);
    }
  }, []);

  const addCategory = async (data: { name: string; description?: string; image?: string }): Promise<boolean> => {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Category created successfully!");
        await fetchCategories();
        return true;
      } else {
        toast.error(json.error || "Failed to create category");
        return false;
      }
    } catch {
      toast.error("Network error creating category");
      return false;
    }
  };

  const editCategory = async (
    id: string,
    data: { name: string; description?: string; image?: string }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Category updated successfully!");
        await fetchCategories();
        return true;
      } else {
        toast.error(json.error || "Failed to update category");
        return false;
      }
    } catch {
      toast.error("Network error updating category");
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Category deleted!");
        await fetchCategories();
        return true;
      } else {
        toast.error(json.error || "Failed to delete category");
        return false;
      }
    } catch {
      toast.error("Network error deleting category");
      return false;
    }
  };

  const refresh = fetchCategories;

  return (
    <CategoryContext.Provider
      value={{ categories, loading, fetchCategories, addCategory, editCategory, deleteCategory, refresh }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used within a CategoryProvider");
  return ctx;
};
