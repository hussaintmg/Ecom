"use client";
import React, { useState } from "react";
import useSWR from "swr";
import ProductCard from "@/components/products/ProductCard";
import { FadeIn } from "@/components/Animate";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ProductsPage = () => {
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const { data: products, error } = useSWR(`/api/products?category=${category}&sort=${sort}`, fetcher);
  const { data: categories } = useSWR("/api/categories", fetcher);

  if (error) return <div>Failed to load.</div>;

  return (
    <main className="flex-1 py-20 px-4 md:px-8 container mx-auto">
      <header className="mb-16 text-center max-w-2xl mx-auto flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Our Collection</h1>
        <p className="text-muted-foreground text-sm">Discover our curated items for your modern lifestyle. Quality and durability guaranteed.</p>
      </header>

      <div className="mb-12 flex flex-col items-center justify-between gap-6 sm:flex-row p-6 border rounded-3xl bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <button 
              onClick={() => setCategory("")} 
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${!category ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted/50"}`}
          >
              All items
          </button>
          {categories?.map((c: any) => (
            <button 
              key={c._id} 
              onClick={() => setCategory(c._id)} 
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${category === c._id ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted/50"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-muted-foreground italic">Sorting:</span>
          <select 
              className="rounded-full border px-4 py-2 text-xs font-bold bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {!products ? (
        <div className="p-20 text-center animate-pulse text-muted-foreground">Searching items...</div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p: any) => (
            <FadeIn key={p._id}>
              <ProductCard product={p} />
            </FadeIn>
          ))}
        </div>
      )}
    </main>
  );
};

export default ProductsPage;
