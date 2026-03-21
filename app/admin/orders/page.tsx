"use client";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { 
  Package, 
  Truck, 
  Clock, 
  Search, 
  Filter, 
  Phone,
  MapPin,
  CreditCard,
  AlertCircle
} from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "@/utils/toast";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const AdminOrdersPage = () => {
  const { data: orders, mutate, isLoading } = useSWR("/api/orders", fetcher, { 
    refreshInterval: 10000 
  });

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const updateStatus = async (id: string, status?: string, paymentStatus?: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentStatus }),
      });
      if (res.ok) {
        toast.success(`Order logistics updated successfully`);
        mutate();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Update failed");
      }
    } catch (e) { toast.error("Logistics update failed"); }
  };

  const filteredOrders = orders?.filter((o: any) => {
    const matchesFilter = filter === "all" || o.status === filter;
    const matchesSearch = !search || o._id.toLowerCase().includes(search.toLowerCase()) || o.user?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-muted-foreground uppercase tracking-widest text-xs">Accessing Logistics Console...</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-amber-600 bg-amber-500/10 border-amber-500/20";
      case "processing": return "text-blue-600 bg-blue-500/10 border-blue-500/20";
      case "shipped": return "text-purple-600 bg-purple-500/10 border-purple-500/20";
      case "delivered": return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
      case "cancelled": return "text-red-600 bg-red-500/10 border-red-500/20";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  return (
    <div className="flex flex-col gap-10">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black tracking-tighter">Order Processing</h1>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock size={14}/> Real-time Logistics Fleet Dashboard
            </p>
        </div>
        <div className="flex bg-muted/30 p-1.5 rounded-2xl border flex-wrap">
            {["all", "pending", "processing", "shipped", "delivered"].map((s) => (
                <button 
                  key={s} onClick={() => setFilter(s)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                    {s}
                </button>
            ))}
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
                placeholder="Search by Order ID or Customer Name..."
                className="w-full bg-card/50 border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-1 focus:ring-primary outline-none transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
            />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex flex-col gap-6">
        {filteredOrders.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-[40px] flex flex-col items-center gap-4 opacity-30 italic">
                <AlertCircle size={40}/>
                <span className="text-sm font-black uppercase tracking-[4px]">No Matching Shipments Found</span>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-6">
                {filteredOrders.map((o: any) => (
                    <div key={o._id} className="group p-6 md:p-8 rounded-[40px] border bg-card/30 hover:bg-card hover:shadow-2xl hover:shadow-primary/5 transition-all flex flex-col lg:flex-row lg:items-center gap-8 relative overflow-hidden">
                        
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(o.status).split(' ')[1].replace('text-', 'bg-')}`} />

                        {/* Top Row: ID & Date */}
                        <div className="flex items-center justify-between lg:justify-start lg:flex-col lg:items-start gap-2 min-w-[140px]">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">Shipment ID</span>
                                <span className="text-sm font-black italic tracking-tighter truncate max-w-[120px]">#{o._id.slice(-8).toUpperCase()}</span>
                            </div>
                            <div className="flex flex-col items-end lg:items-start">
                                <span className="text-[10px] font-black uppercase tracking-tighter opacity-40 lg:hidden">Placed On</span>
                                <span className="text-[10px] font-bold text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Middle Section: Customer & Delivery */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1">
                            <div className="flex items-center gap-4 min-w-[200px]">
                                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-black text-muted-foreground/30 text-xl border shrink-0">
                                    {o.user?.profileImage?.url ? <img src={o.user.profileImage.url} className="w-full h-full object-cover rounded-2xl" /> : o.user?.name?.[0]}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black text-lg tracking-tight leading-none truncate">{o.user?.name || "Guest Customer"}</span>
                                    <span className="text-xs font-medium text-muted-foreground truncate">{o.user?.email}</span>
                                </div>
                            </div>

                            <div className="hidden sm:block h-10 w-px bg-border/50" />

                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                 <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-md">{o.shippingAddress?.city}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5"><Phone size={12} className="text-primary"/> {o.shippingAddress?.phone}</span>
                                 </div>
                                 <p className="text-xs font-medium leading-relaxed text-foreground/80 line-clamp-1 opacity-70">
                                    {o.shippingAddress?.address}
                                 </p>
                            </div>
                        </div>

                        {/* Financials & Controls */}
                        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 pt-6 lg:pt-0 border-t lg:border-none">
                            <div className="flex flex-col lg:items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary italic opacity-60">{o.items?.length} Items</span>
                                <span className="text-2xl font-black tracking-tighter">Rs. {o.totalPrice.toLocaleString()}</span>
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                                    {o.paymentMethod === "COD" ? <Truck size={10}/> : <CreditCard size={10}/>} {o.paymentMethod}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2 rounded-3xl border">
                                <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${getStatusColor(o.status)}`}>
                                    {o.status}
                                </div>
                                
                                <select 
                                    className="bg-background border shadow-sm rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:border-primary/30 transition-all"
                                    value={o.status || ""}
                                    onChange={(e) => updateStatus(o._id, e.target.value, undefined)}
                                >
                                    <option value="pending">PENDING</option>
                                    <option value="processing">PROCESS</option>
                                    <option value="shipped">SHIP</option>
                                    <option value="delivered">DELIVER</option>
                                    <option value="cancelled">CANCEL</option>
                                </select>

                                <div className="flex items-center gap-2 border-l pl-3">
                                    <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${o.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                        {o.paymentStatus}
                                    </div>
                                    <select 
                                        className="bg-background border shadow-sm rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer hover:border-primary/30 transition-all h-8"
                                        value={o.paymentStatus || ""}
                                        onChange={(e) => updateStatus(o._id, undefined, e.target.value)}
                                    >
                                        <option value="pending">UNPAID</option>
                                        <option value="paid">PAID</option>
                                    </select>
                                </div>

                                <div className="hidden sm:flex flex-col items-end gap-1 px-4 border-l">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{o.shippingAddress?.country}</span>
                                    {o.shippingAddress?.preciseLocation && (
                                        <div className="flex items-center gap-1 group/loc relative">
                                            <MapPin size={14} className="text-primary" />
                                            <div className="absolute bottom-full right-0 mb-2 scale-0 group-hover/loc:scale-100 transition-all origin-bottom-right bg-black text-white p-2 rounded-xl text-[9px] font-bold w-[180px] z-50 shadow-2xl">
                                                {o.shippingAddress.preciseLocation}
                                                <div className="absolute top-full right-3 border-8 border-transparent border-t-black" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <Package size={160} />
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
