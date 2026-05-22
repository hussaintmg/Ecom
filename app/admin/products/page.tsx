"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductProvider, useProducts } from "@/context/ProductContext";
import { CategoryProvider, useCategories } from "@/context/CategoryContext"; // import useCategories
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
} from "lucide-react";

/* ─── Loading Skeleton (unchanged) ─── */
const Skeleton = () => (
  <div className="animate-pulse flex flex-col gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-20 rounded-xl bg-muted/60" />
    ))}
  </div>
);

/* ─── Stock Badge (unchanged) ─── */
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

/* ─── Inner component ─── */
const ProductsInner = () => {
  const router = useRouter();
  const { products, loading, fetchProducts, deleteProduct } = useProducts();
  const { categories } = useCategories(); // get all categories from provider
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteProduct(id);
    setDeleteConfirm(null);
    setDeleting(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  // Build a map from category ID to category name (for unpopulated products)
  const categoryIdToName = new Map<string, string>();
  categories.forEach((cat) => {
    categoryIdToName.set(cat._id, cat.name);
  });

  // Helper to get the category name reliably
  const getCategoryName = (product: any): string | null => {
    if (!product.category) return null;
    // If category is already populated (object with name)
    if (typeof product.category === "object" && product.category.name) {
      return product.category.name;
    }
    // If category is an ID string
    if (typeof product.category === "string") {
      return categoryIdToName.get(product.category) || null;
    }
    return null;
  };

  // Category options for dropdown: "All" + all unique category names from the CategoryProvider
  const categoryOptions = ["All", ...categories.map((c) => c.name)];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const productCatName = getCategoryName(p);
    const matchesCategory =
      selectedCategory === "All" || productCatName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filteredProducts.length} product
              {filteredProducts.length !== 1 ? "s" : ""} total
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

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
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

      {/* ── Content (rest of the table and cards remain identical, only the category display inside the table needs the same helper) ── */}
      {loading ? (
        <Skeleton />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border rounded-2xl bg-card border-dashed">
          <Package size={40} className="opacity-30" />
          <p className="text-sm font-medium">No products yet.</p>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={14} /> Add Your First Product
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border rounded-2xl bg-card border-dashed">
          <Search size={40} className="opacity-30" />
          <p className="text-sm font-medium">No products match your filters.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
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
                {filteredProducts.map((p, idx) => (
                  <tr
                    key={p._id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {idx + 1}
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
                            router.push(`/admin/products/${p._id}`)
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

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredProducts.map((p, idx) => (
              <div
                key={p._id}
                className="rounded-2xl border bg-card p-4 shadow-sm flex gap-3"
              >
                {/* Thumbnail */}
                <div className="shrink-0">
                  {p.images?.[0]?.url ? (
                    <img
                      src={p.images[0].url}
                      alt={p.name}
                      className="w-16 h-16 rounded-xl object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <ImageIcon size={18} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 mr-1.5">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm">{p.name}</span>
                    </div>
                  </div>
                  <StockBadge stock={p.stock} />
                  <div className="flex gap-2 pt-2 border-t mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() =>
                        router.push(`/admin/products/${p._id}`)
                      }
                    >
                      <Settings size={12} /> Manage
                    </Button>
                    {deleteConfirm === p._id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="bg-destructive text-white text-xs"
                          disabled={deleting === p._id}
                          onClick={() => handleDelete(p._id)}
                        >
                          {deleting === p._id ? "..." : "Delete"}
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
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal for Add Product (unchanged) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
            <ProductForm
              onComplete={() => {
                setShowForm(false);
                fetchProducts();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Page wrapper ─── */
const AdminProductsPage = () => (
  <ProductProvider>
    <CategoryProvider>
      <ProductsInner />
    </CategoryProvider>
  </ProductProvider>
);

export default AdminProductsPage;
