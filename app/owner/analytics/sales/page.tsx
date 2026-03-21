"use client";
import React, { useEffect, useState } from "react";
import { ProductProvider, useProducts } from "@/context/ProductContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid, Legend
} from "recharts";
import { ArrowLeft, TrendingUp, AlertTriangle, RefreshCw, Package } from "lucide-react";

interface DailyIncome {
  date: string;
  total: number;
}

interface LowStockProduct {
  _id: string;
  name: string;
  stock: number;
  price: number;
}

const SalesInner = () => {
  const { products, fetchProducts } = useProducts();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const [dailyIncome, setDailyIncome] = useState<DailyIncome[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const qs = selectedProductId ? `?productId=${selectedProductId}` : "";
    try {
      const res = await fetch(`/api/analytics/sales${qs}`);
      if (res.ok) {
        const data = await res.json();
        setDailyIncome(data.dailyIncome);
        setLowStock(data.lowStockProducts);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchAnalytics();
  }, [selectedProductId, fetchProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  // Convert dates nicely
  const chartData = dailyIncome.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Revenue: d.total
  }));

  const stockChartData = lowStock.map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "..." : p.name,
    stock: p.stock
  }));

  const inputClass = "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Sales Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review day-by-day revenue and critical stock alerts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className={inputClass}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
             <option value="">All Products Overview</option>
             {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <button 
            disabled={refreshing || loading}
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border bg-background hover:bg-muted/50 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-8 animate-pulse">
            <div className="h-96 rounded-2xl bg-muted/60" />
            <div className="h-80 rounded-2xl bg-muted/60" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Daily Income Area Chart */}
          <div className="border rounded-2xl p-6 bg-card shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <TrendingUp size={18} className="text-primary"/> 30-Day Revenue Timeline
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedProductId 
                   ? `Tracking revenue specifically generated from the selected product.` 
                   : "Tracking combined income from Orders and Manual Sales Invoices."}
              </p>
            </div>
            
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `Rs.${val}`} />
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                     formatter={(value: any) => [`Rs. ${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Stock Bar Chart */}
          <div className="border rounded-2xl p-6 bg-card shadow-sm flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 text-amber-600">
                <AlertTriangle size={18} /> Critical Low Stock Warning
              </h2>
              <p className="text-sm text-muted-foreground">
                Products nearing outness (less than 15 units left).
              </p>
            </div>
            {lowStock.length === 0 ? (
               <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground border border-dashed rounded-xl bg-background/50">
                  <Package size={32} className="opacity-40" />
                  <p className="text-sm font-medium">All products are healthily stocked!</p>
               </div>
            ) : (
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockChartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.4} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={120} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: 'var(--muted)', opacity: 0.4}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                      />
                      <Bar dataKey="stock" radius={[0, 4, 4, 0]} barSize={20}>
                        {stockChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.stock <= 5 ? "#ef4444" : "#f59e0b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SalesAnalyticsPage = () => {
   return (
      <ProductProvider>
        <SalesInner />
      </ProductProvider>
   );
};

export default SalesAnalyticsPage;
