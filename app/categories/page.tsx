"use client";
import React from "react";
import useSWR from "swr";
import Link from "next/link";
import { Grid, ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/Animate";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CategoriesPage() {
  const { data: categories, error } = useSWR("/api/categories", fetcher);

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <main className="flex-1 container mx-auto px-4 py-20 flex flex-col gap-12">
        <header className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
          <div className="p-3 bg-primary/10 text-primary rounded-full">
            <Grid size={24} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Browse by Category
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover a wide variety of our premium selection by navigating
            directly to your desired category segment.
          </p>
        </header>

        {!categories && !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-3xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto w-full">
            {categories.map((c: any, idx: number) => (
              <FadeIn key={c._id} delay={idx * 0.1}>
                <Link
                  href={`/categories/${c._id}`}
                  className="group border p-8 rounded-3xl bg-card shadow-sm hover:shadow-2xl transition-all flex flex-col gap-4 relative overflow-hidden h-full border-primary/5 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                      {c.name}
                    </h2>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                      <ChevronRight
                        size={18}
                        className="translate-x-0 group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 pr-6">
                    {c.description ||
                      "Discover premium quality items meticulously crafted and rigorously tested within this category."}
                  </p>

                  {/* Products count indicator below */}
                  <div className="mt-auto pt-6 flex items-center gap-2">
                    {c.products && c.products.length > 0 ? (
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                        {c.products.length} Products
                      </span>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full border border-dashed text-center">
                        Empty
                      </span>
                    )}
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
