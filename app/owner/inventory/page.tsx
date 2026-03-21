"use client";
import React, { useEffect, useState } from "react";
import { ProductProvider, useProducts } from "@/context/ProductContext";
import { Grid, RefreshCw, Package, Search } from "lucide-react";
import Button from "@/components/ui/Button";

const InventoryInner = () => {
  const { products, loading, fetchProducts } = useProducts();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Grid size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Stock Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Current stock levels across all products
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh Status
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm border rounded-xl border-dashed">
            No products found matching your search.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredProducts.map((p) => (
              <div
                key={p._id}
                className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">Category: {p.category?.name || "None"}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-lg font-black ${
                      p.stock > 10
                        ? "text-emerald-600"
                        : p.stock > 0
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  >
                    {p.stock}
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Units Left
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const OwnerInventoryPage = () => {
  return (
    <ProductProvider>
      <InventoryInner />
    </ProductProvider>
  );
};

export default OwnerInventoryPage;
