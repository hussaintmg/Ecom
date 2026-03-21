"use client";
import React from "react";
import useSWR from "swr";
import Link from "next/link";
import { FadeIn, ScaleOnHover } from "@/components/Animate";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const CategoriesPreview = () => {
  const { data: categories } = useSWR("/api/categories", fetcher);

  if (!categories) return null;

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="mb-12 text-center text-4xl font-extrabold tracking-tight">Browse Categories</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 3).map((category: any, idx: number) => (
            <Link href={`/categories/${category._id}`} key={category._id}>
              <FadeIn delay={idx * 0.1}>
                <ScaleOnHover>
                  <div className="group relative overflow-hidden rounded-2xl bg-muted aspect-4/3 text-center transition-all hover:bg-muted/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h3 className="text-2xl font-bold tracking-tight text-foreground transition-transform group-hover:scale-110">{category.name}</h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shop Now →</div>
                  </div>
                </ScaleOnHover>
              </FadeIn>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesPreview;
