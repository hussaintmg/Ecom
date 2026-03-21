"use client";
import React, { useEffect, useState } from "react";
import { Users, ShoppingBag, Clock, DollarSign, ChevronDown, PackageSearch, CreditCard } from "lucide-react";

interface UserContext {
  _id: string;
  name: string;
  email: string;
  lastLogin?: string;
  cart: any[];
  orders: any[];
  totalOrders: number;
  totalSpent: number;
}

export default function TrafficPage() {
  const [users, setUsers] = useState<UserContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/users");
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error("Traffic parse error", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedUser(expandedUser === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-xl">
          <Users size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Customer Database</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor registered buyers, their carts, payments, and activity.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
           {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted/60" />
           ))}
        </div>
      ) : users.length === 0 ? (
         <div className="flex flex-col items-center py-20 gap-4 opacity-40">
           <Users size={40} />
           <p className="text-sm">No regular users registered yet.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {users.map(user => (
            <div key={user._id} className="border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col transition-all">
               {/* Header / Summary */}
               <div 
                 onClick={() => toggleExpand(user._id)}
                 className="flex flex-wrap md:flex-nowrap items-center justify-between p-5 gap-4 cursor-pointer hover:bg-muted/10 transition-colors"
               >
                 <div className="flex-1 min-w-0">
                   <h2 className="text-lg font-bold flex items-center gap-2">
                     {user.name} 
                     {(user.totalOrders > 0) && (
                         <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                           Buyer
                         </span>
                     )}
                   </h2>
                   <p className="text-sm text-muted-foreground">{user.email}</p>
                   
                   <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-muted-foreground">
                      <div className="flex gap-1.5 items-center">
                        <DollarSign size={14} className="text-foreground"/>
                        <span className="text-foreground">Total Spent: </span>
                        <span className="text-emerald-600 font-bold">Rs. {user.totalSpent.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <ShoppingBag size={14} className="text-foreground" />
                        <span>Orders: {user.totalOrders}</span>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <Clock size={14} className="text-foreground"/>
                        <span>Last Active: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}</span>
                      </div>
                   </div>
                 </div>
                 
                 <div className="shrink-0 p-2 bg-muted rounded-full ml-auto">
                    <ChevronDown size={18} className={`transition-transform duration-300 ${expandedUser === user._id ? "rotate-180" : ""}`} />
                 </div>
               </div>

               {/* Expanded Details */}
               {expandedUser === user._id && (
                 <div className="p-5 border-t bg-muted/20 flex flex-col gap-8 md:grid lg:grid-cols-2">
                    
                    {/* User's Cart */}
                    <div className="flex flex-col gap-4">
                       <h3 className="text-sm font-black tracking-tight text-amber-600 flex gap-2 items-center">
                         <PackageSearch size={16} /> Currently Tracking in Cart
                       </h3>
                       {user.cart.length === 0 ? (
                           <div className="p-4 rounded-xl border border-dashed bg-card/60 text-xs text-muted-foreground text-center">
                             Cart is empty
                           </div>
                       ) : (
                           <div className="flex flex-col gap-3">
                             {user.cart.map((c, i) => (
                               <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-card border shadow-sm">
                                  {c.product?.images?.[0]?.url ? (
                                     <img src={c.product.images[0].url} alt="" className="w-12 h-12 rounded object-cover border" />
                                  ) : <div className="w-12 h-12 bg-muted rounded"></div>}
                                  <div className="flex-1 min-w-0">
                                     <p className="text-xs font-bold truncate">{c.product?.name || "Deleted Product"}</p>
                                     <p className="text-[10px] text-muted-foreground">Qty: {c.quantity} • Rs. {(c.product?.price || 0).toLocaleString()}</p>
                                  </div>
                               </div>
                             ))}
                           </div>
                       )}
                    </div>

                    {/* Order History */}
                    <div className="flex flex-col gap-4">
                       <h3 className="text-sm font-black tracking-tight text-primary flex gap-2 items-center">
                         <CreditCard size={16} /> Verified Purchases
                       </h3>
                       {user.orders.length === 0 ? (
                           <div className="p-4 rounded-xl border border-dashed bg-card/60 text-xs text-muted-foreground text-center">
                             No purchases yet
                           </div>
                       ) : (
                           <div className="flex flex-col gap-3">
                             {user.orders.map((o, i) => (
                               <div key={i} className="flex flex-col p-4 rounded-xl bg-card border shadow-sm gap-2">
                                  <div className="flex justify-between items-start border-b pb-2">
                                     <div>
                                        <div className="flex gap-2 items-center">
                                           <p className="text-sm font-bold text-emerald-600">Rs. {o.totalPrice.toLocaleString()}</p>
                                           <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${o.paymentMethod === 'Cash on Delivery' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                             {o.paymentMethod}
                                           </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          {new Date(o.createdAt).toLocaleString()}
                                        </p>
                                     </div>
                                     <div className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-1 rounded">
                                        {o.status}
                                     </div>
                                  </div>

                                  <div className="flex flex-col gap-1.5 pt-1">
                                     {o.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">{item.quantity}x {item.name.length > 20 ? item.name.slice(0, 20)+'...' : item.name}</span>
                                          <span className="font-semibold">Rs. {item.price.toLocaleString()}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                             ))}
                           </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
