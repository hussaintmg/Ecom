"use client";
import React from "react";
import useSWR from "swr";
import ProductCard from "@/components/products/ProductCard";
import { FadeIn } from "@/components/Animate";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const FeaturedProducts = () => {
  const { data: products, error } = useSWR("/api/products", fetcher, { 
    refreshInterval: 5000 // Auto-refresh every 5 seconds
  });

  if (error) return <div>Failed to load products.</div>;
  if (!products) return <div className="p-8 text-center text-muted-foreground">Loading products...</div>;

  const popular = products.slice(0, 4);

  return (
    <section className="bg-muted/30 py-24">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">Popular Products</h2>
            <p className="text-muted-foreground">The most-wanted items for your lifestyle.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((product: any, idx: number) => (
            <FadeIn key={product._id} delay={idx * 0.1}>
              <ProductCard product={product} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
