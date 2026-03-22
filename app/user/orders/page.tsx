"use client";
import React, { useState, useEffect } from "react";
import { useOrders } from "@/context/OrderContext";
import {
  Package,
  Truck,
  ShieldCheck,
  CreditCard,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "@/utils/toast";



const OrdersPage = () => {
  const { orders, loading, cancelOrder } = useOrders();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center animate-pulse text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Authenticating Shipment History...
      </div>
    );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "processing":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "shipped":
        return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      case "delivered":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "cancelled":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-muted-foreground bg-muted/10 border-border";
    }
  };

  return (
    <main className="flex-1 py-12 px-4 md:px-8 container mx-auto flex flex-col gap-12 max-w-6xl pb-32">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter">Your Orders</h1>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" /> Verified
          Transaction Lifecycle
        </p>
      </div>

      {orders?.length === 0 ? (
        <div className="py-24 text-center bg-card/30 border border-dashed rounded-[40px] flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-4xl grayscale opacity-30">
            📦
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-black tracking-tight uppercase tracking-tighter">
              No Active Shipments.
            </p>
            <p className="text-sm text-muted-foreground italic font-medium">
              When you order something, it'll appear right here!
            </p>
          </div>
          <Link href="/products">
            <Button className="rounded-2xl px-12 h-14 font-black shadow-xl shadow-primary/20 text-lg">
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orders?.map((o: any) => (
            <motion.div
              key={o._id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group p-8 rounded-[40px] border bg-card/30 hover:bg-card hover:shadow-2xl hover:shadow-primary/5 transition-all relative overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                {/* Status Marker */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <div
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit ${getStatusColor(o.status)}`}
                  >
                    {o.status}
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">
                        Order Hash
                      </span>
                      <span className="text-sm font-black italic tracking-tighter">
                        #{o._id.slice(-10).toUpperCase()}
                      </span>
                    </div>
                    <div className="w-[1px] h-8 bg-border" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">
                        Date Placed
                      </span>
                      <span className="text-sm font-black italic tracking-tighter">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product Thumbnails Gallery */}
                <div className="flex-1 flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar">
                  {o.items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="shrink-0 w-24 h-24 rounded-3xl bg-muted border overflow-hidden relative group/item shadow-sm"
                    >
                      {item.image || item.product?.images?.[0]?.url ? (
                        <img
                          src={item.image || item.product.images[0].url}
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black opacity-30">
                          IMG
                        </div>
                      )}
                      <div className="absolute bottom-0 w-full rounded-b-[24px] bg-black/60 backdrop-blur-sm text-[10px] text-white p-1 text-center font-black">
                        ×{item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price & Action */}
                <div className="flex flex-col items-center lg:items-end gap-3 min-w-[220px]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">
                    Lifecycle Overview
                  </span>
                  <span className="text-4xl font-black tracking-tighter">
                    Rs. {o.totalPrice.toLocaleString()}
                  </span>
                  <div className="flex flex-col gap-2 w-full lg:w-auto">
                    {/* Financial Status */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 px-4 py-2 rounded-2xl bg-muted/30 border">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Payment Settlement</span>
                      <div
                        className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[2px] border px-3 py-1 rounded-full ${o.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}
                      >
                        {o.paymentStatus === "paid" ? "Verified" : "Pending"}
                      </div>
                    </div>
                    
                    {/* Logistical Status */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 px-4 py-2 rounded-2xl bg-muted/30 border">
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Delivery Progress</span>
                       <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[2px] border px-3 py-1 rounded-full ${getStatusColor(o.status)}`}>
                          {o.status}
                       </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[2px] text-muted-foreground/50 self-end mt-1">
                      {o.paymentMethod === "COD" ? (
                        <>
                          <Truck size={10} /> Cash on Delivery
                        </>
                      ) : (
                        <>
                          <CreditCard size={10} /> Prepaid Transaction
                        </>
                      )}
                    </div>

                    {/* Cancel Action */}
                    {["pending", "processing"].includes(o.status) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 text-destructive border-destructive/20 hover:bg-destructive/5 rounded-2xl font-bold gap-2 text-[10px] uppercase tracking-widest h-10 w-full"
                        onClick={async (e) => {
                          e.preventDefault();
                          if(!confirm("Are you sure you want to cancel this order? This action will initiate an automated refund for prepaid orders.")) return;
                          await cancelOrder(o._id);
                        }}
                      >
                        <XCircle size={14} /> Cancel Shipment
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Flair */}
              <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none -rotate-12">
                <Package size={200} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
};

export default OrdersPage;
