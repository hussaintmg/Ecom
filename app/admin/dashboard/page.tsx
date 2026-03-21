"use client";
import React from "react";
import useSWR from "swr";
import { Package, ShoppingBag, Grid, MessageSquare } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DashboardSummary = () => {
  const { data: products } = useSWR("/api/products", fetcher);
  const { data: orders } = useSWR("/api/orders", fetcher);
  const { data: categories } = useSWR("/api/categories", fetcher);
  const { data: enquiries } = useSWR("/api/enquiries", fetcher);

  const stats = [
    { name: "Total Products", value: products?.length || 0, icon: Package },
    { name: "Total Orders", value: orders?.length || 0, icon: ShoppingBag },
    { name: "Categories", value: categories?.length || 0, icon: Grid },
    { name: "Enquiries", value: enquiries?.length || 0, icon: MessageSquare },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.name} className="p-6 rounded-2xl border bg-card flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
            <div className="bg-primary/10 w-10 h-10 flex items-center justify-center rounded-lg text-primary">
              <Icon size={20} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.name}</div>
              <div className="text-3xl font-extrabold tracking-tight mt-1">{stat.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardSummary;
