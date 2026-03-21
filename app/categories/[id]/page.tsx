"use client";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import ProductCard from "@/components/products/ProductCard";
import { FadeIn, StaggerContainer } from "@/components/Animate";
import { Grid, ShoppingBag, LayoutGrid } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CategoryDetailsPage() {
  const { id } = useParams();
  
  const { data: category } = useSWR(`/api/categories/${id}`, fetcher);
  const { data: products, error, isLoading } = useSWR(
    id ? `/api/products?category=${id}` : null, 
    fetcher
  );

  return (
    <main className="flex-1 container mx-auto px-4 py-20 flex flex-col gap-12">
      {/* Header Section */}
      <FadeIn>
        <header className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto mb-8">
          <div className="p-4 bg-primary/10 text-primary rounded-[32px] shadow-xl shadow-primary/5 border border-primary/10">
            <LayoutGrid size={32} />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter capitalize italic">
              {category?.name || "Premium Category"}
            </h1>
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-primary/30" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60">
                {products?.length || 0} Curated Collections
              </p>
              <span className="h-px w-12 bg-primary/30" />
            </div>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed font-medium">
            {category?.description || "Experience the pinnacle of craftsmanship and design within our specialized collection segments."}
          </p>
        </header>
      </FadeIn>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-4/5 rounded-[40px] bg-muted/60 border-2 border-dashed" />
          ))}
        </div>
      ) : error ? (
        <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed rounded-[40px] opacity-40 italic">
          <Grid size={48} />
          <span className="font-black uppercase tracking-widest text-sm">Failed to synchronize category data</span>
        </div>
      ) : products?.length === 0 ? (
        <div className="py-24 text-center flex flex-col items-center gap-6 bg-card/30 border border-dashed rounded-[40px] opacity-40">
          <ShoppingBag size={64} className="grayscale" />
          <div className="flex flex-col gap-2">
              <p className="text-2xl font-black tracking-tight">The vault is currently empty.</p>
              <p className="text-sm font-medium italic">New premium arrivals coming soon to this segment.</p>
          </div>
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {products?.map((p: any) => (
            <FadeIn key={p._id}>
              <ProductCard product={p} />
            </FadeIn>
          ))}
        </StaggerContainer>
      )}
    </main>
  );
}
