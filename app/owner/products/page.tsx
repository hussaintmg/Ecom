// app/owner/products/page.tsx

"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/context/ProductContext";
import { useCategories } from "@/context/CategoryContext";
import ProductForm from "@/components/dashboard/ProductForm";
import Button from "@/components/ui/Button";
import {
  Plus,
  Trash2,
  RefreshCw,
  X,
  Package,
  Settings,
  ImageIcon,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Skeleton = () => (
  <div className="animate-pulse flex flex-col gap-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-20 rounded-xl bg-muted/60" />
    ))}
  </div>
);

const StockBadge = ({ stock }: { stock: number }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
      stock > 10
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
        : stock > 0
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
    }`}
  >
    {stock > 0 ? `${stock} In Stock` : "Out of Stock"}
  </span>
);

const ProductsInner = () => {
  const router = useRouter();
  const {
    products,
    totalProducts,
    currentPage,
    totalPages,
    loading,
    fetchProducts,
    deleteProduct,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useProducts();
  const { categories } = useCategories();

  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("");
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localCategory, setLocalCategory] = useState(selectedCategory);

  // Fetch products when dependencies change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
      if (localCategory !== selectedCategory) {
        setSelectedCategory(localCategory);
      }
      fetchProducts(currentPage, localSearch, localCategory);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPage, localSearch, localCategory]);

  // Initial fetch
  useEffect(() => {
    fetchProducts(1, "", "All");
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteProduct(id);
    setDeleteConfirm(null);
    setDeleting(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(currentPage, localSearch, localCategory);
    setRefreshing(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalCategory(e.target.value);
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const getCategoryName = (product: any): string | null => {
    if (!product.category) return null;
    if (typeof product.category === "object" && product.category.name) {
      return product.category.name;
    }
    const category = categories.find((c) => c._id === product.category);
    return category ? category.name : null;
  };

  const categoryOptions = ["All", ...categories.map((c) => c.name)];
  const startProduct = (currentPage - 1) * 10 + 1;
  const endProduct = Math.min(currentPage * 10, totalProducts);

  if (loading && products.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalProducts > 0
                ? `Showing ${startProduct}-${endProduct} of ${totalProducts} products`
                : "No products found"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="gap-2"
            >
              <Plus size={14} /> Add Product
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              placeholder="Search products by name..."
              value={localSearch}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <select
            value={localCategory}
            onChange={handleCategoryChange}
            className="px-4 py-2 text-sm rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer min-w-[160px]"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalProducts === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border rounded-2xl bg-card border-dashed">
          <Package size={40} className="opacity-30" />
          <p className="text-sm font-medium">No products found.</p>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={14} /> Add Your First Product
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p, idx) => (
                  <tr
                    key={p._id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {(currentPage - 1) * 10 + idx + 1}
                    </td>
                    <td className="px-6 py-3">
                      {p.images?.[0]?.url ? (
                        <img
                          src={p.images[0].url}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon
                            size={14}
                            className="text-muted-foreground"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold">{p.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {getCategoryName(p) || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StockBadge stock={p.stock} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() =>
                            router.push(`/owner/products/${p._id}`)
                          }
                        >
                          <Settings size={12} /> Manage
                        </Button>
                        {deleteConfirm === p._id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive font-bold text-xs"
                              disabled={deleting === p._id}
                              onClick={() => handleDelete(p._id)}
                            >
                              {deleting === p._id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                "Confirm"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(p._id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft size={14} /> Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Go to page</span>
                  <input
                    type="number"
                    value={pageInput}
                    placeholder={`${currentPage}`}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && goToPage(parseInt(pageInput))
                    }
                    className="w-16 px-2 py-1 text-sm text-center border rounded-md bg-card"
                    min={1}
                    max={totalPages}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goToPage(parseInt(pageInput))}
                    disabled={!pageInput}
                  >
                    Go
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
            <ProductForm
              onComplete={() => {
                setShowForm(false);
                fetchProducts(1, localSearch, localCategory);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const OwnerProductsPage = () => {
  return <ProductsInner />;
};

export default OwnerProductsPage;
