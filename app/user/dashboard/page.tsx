"use client";

import React, { useEffect, useState } from "react";
import { User, Package, ShoppingCart, Settings, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/Animate";
import { useOrders } from "@/context/OrderContext";
import { useCart } from "@/context/CartContext";

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null);
  const { orders, loading: ordersLoading } = useOrders();
  const { cart } = useCart();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok && r.json()).then(d => d && setUser(d.user));
  }, []);

  const totalCartItems = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  const stats = [
    { title: "Total Orders", value: ordersLoading ? "..." : orders.length.toString(), icon: Package, href: "/user/orders" },
    { title: "Items in Cart", value: totalCartItems.toString(), icon: ShoppingCart, href: "/cart" },
    { title: "Profile Settings", value: "Active", icon: Settings, href: "/user/profile" },
  ];

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <FadeIn>
        <div className="p-8 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary/5 to-background border border-primary/20 shadow-sm flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 border-2 border-primary/30 shadow-inner">
            <User size={36} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name || "Shopper"}!</h2>
            <p className="text-muted-foreground mt-1">Manage your orders, profile, and settings from your personalized dashboard.</p>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <FadeIn key={stat.title} delay={i * 0.1}>
              <Link href={stat.href} className="flex flex-col gap-4 p-6 rounded-3xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all group">
                <div className="p-3 bg-accent/50 rounded-2xl w-max text-primary group-hover:bg-primary/10 transition-colors">
                  <Icon size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</span>
                  <span className="text-3xl font-black mt-1">{stat.value}</span>
                </div>
              </Link>
            </FadeIn>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <FadeIn delay={0.4}>
            <div className="p-8 rounded-3xl border border-border/50 bg-card shadow-sm h-full flex flex-col gap-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-xl font-bold">Recent Orders Overview</h3>
                    <Link href="/user/orders" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">View All <ChevronRight size={14} /></Link>
                </div>
                
                {ordersLoading ? (
                    <div className="flex-1 flex items-center justify-center">Loading...</div>
                ) : recentOrders.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {recentOrders.map((order) => (
                            <div key={order._id} className="flex justify-between items-center bg-accent/20 p-4 rounded-xl">
                                <div className="flex flex-col">
                                    <span className="font-bold">{order.orderNumber}</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{order.status}</span>
                                </div>
                                <span className="font-black">${order.totalAmount?.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 py-8">
                        <Package size={48} className="text-accent-foreground/30" />
                        <p>No recent orders found.</p>
                        <Link href="/products" className="text-primary hover:underline font-medium">Start shopping</Link>
                    </div>
                )}
            </div>
        </FadeIn>
        
        <FadeIn delay={0.5}>
            <div className="p-8 rounded-3xl border border-border/50 bg-card shadow-sm h-full flex flex-col gap-6">
                <h3 className="text-xl font-bold border-b pb-4">Profile Details</h3>
                <div className="flex flex-col gap-4 text-sm mt-2">
                    <div className="flex justify-between items-center bg-accent/20 p-4 rounded-xl">
                        <span className="text-muted-foreground font-medium">Full Name</span>
                        <span className="font-bold">{user?.name || "Loading..."}</span>
                    </div>
                    <div className="flex justify-between items-center bg-accent/20 p-4 rounded-xl">
                        <span className="text-muted-foreground font-medium">Email Address</span>
                        <span className="font-bold">{user?.email || "Loading..."}</span>
                    </div>
                    <div className="flex justify-between items-center bg-accent/20 p-4 rounded-xl">
                        <span className="text-muted-foreground font-medium">Role</span>
                        <span className="font-bold uppercase tracking-wider text-primary">{user?.role || "Loading..."}</span>
                    </div>
                </div>
            </div>
        </FadeIn>
      </div>
    </div>
  );
}
