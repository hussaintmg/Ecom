"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Trash2, ShoppingBag, Truck, CreditCard, ChevronRight, Plus, Minus } from "lucide-react";
import toast from "@/utils/toast";

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [shippingMethod, setShippingMethod] = useState<"COD" | "Stripe">("COD");
  
  // Calculate Totals
  const items = cart?.items || [];
  const selectedData = items.filter((item: any) => selectedItems.includes(item.product._id));
  
  const subtotal = selectedData.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0);
  const deliveryCharges = subtotal > 0 ? 300 : 0;
  const codCharges = shippingMethod === "COD" && subtotal > 0 ? 50 : 0;
  const total = subtotal + deliveryCharges + codCharges;

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) setSelectedItems([]);
    else setSelectedItems(items.map((i: any) => i.product._id));
  };

  const handleCheckout = () => {
    if (!user) {
        toast.error("Please login to checkout");
        router.push("/login?redirect=/cart");
        return;
    }
    if (selectedItems.length === 0) {
        toast.error("Select items to checkout");
        return;
    }

    // Pass data via localStorage or central state for checkout
    localStorage.setItem("checkout_items", JSON.stringify(selectedData));
    localStorage.setItem("checkout_method", shippingMethod);
    router.push("/checkout");
  };

  if (cartLoading) return <div className="min-h-screen flex items-center justify-center animate-pulse font-black text-muted-foreground uppercase tracking-widest">Loading Your Cart...</div>;

  return (
    <main className="flex-1 py-12 px-4 md:px-8 container mx-auto flex flex-col gap-12">
      <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              Shopping Cart <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">{items.length}</span>
          </h1>
          {items.length > 0 && (
              <button onClick={toggleSelectAll} className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                  {selectedItems.length === items.length ? "Deselect All" : "Select All"}
              </button>
          )}
      </div>

      {items.length === 0 ? (
        <div className="py-24 text-center flex flex-col items-center gap-6 bg-card/30 border border-dashed rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-4xl grayscale opacity-30">🛒</div>
          <div className="flex flex-col gap-2">
              <p className="text-xl font-bold tracking-tight">Your cart is feeling lonely.</p>
              <p className="text-sm text-muted-foreground italic">Add some premium pieces to fill it up!</p>
          </div>
          <Link href="/products">
            <Button className="rounded-2xl px-10 h-12 font-bold shadow-xl shadow-primary/20">Explore Products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:items-start pb-32">
          
          {/* Items List */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {items.map((item: any) => {
              const p = item.product;
              const isSelected = selectedItems.includes(p._id);
              return (
                <div key={p._id} className={`flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl border bg-card transition-all group relative ${isSelected ? "border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/20" : "hover:border-primary/30"}`}>
                  
                  {/* Checkbox */}
                  <div 
                      onClick={() => toggleSelect(p._id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? "bg-primary border-primary text-white" : "border-muted group-hover:border-primary/50"}`}
                  >
                      {isSelected && <ChevronRight size={14} className="rotate-90"/>}
                  </div>

                  {/* Image */}
                  <div className="w-24 h-24 rounded-2xl bg-muted overflow-hidden border shrink-0">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">No Image</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col gap-1 min-w-0 text-center sm:text-left">
                      <Link href={`/products/${p?._id}`} className="text-lg font-black tracking-tight hover:text-primary transition-colors truncate block">{p?.name || "Product Name"}</Link>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{p?.category?.name || "Premium Item"}</p>
                      <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
                          <span className="text-lg font-bold">Rs. {p?.price?.toLocaleString() || "0"}</span>
                          {p?.stock !== undefined && p.stock <= 5 && <span className="text-[10px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full uppercase italic">Only {p.stock} Left!</span>}
                      </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border">
                      <button 
                          onClick={() => updateQuantity(p._id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-background transition-colors disabled:opacity-30"
                          disabled={item.quantity <= 1}
                      >
                          <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button 
                          onClick={() => updateQuantity(p._id, Math.min(p.stock, item.quantity + 1))}
                          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-background transition-colors disabled:opacity-30"
                          disabled={item.quantity >= p.stock}
                      >
                          <Plus size={14} />
                      </button>
                  </div>

                  <button onClick={() => removeFromCart(p._id)} className="p-3 text-destructive hover:bg-destructive/10 rounded-2xl transition-all">
                      <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sticky Order Summary for Desktop */}
          <div className="lg:col-span-4 sticky top-28 flex flex-col gap-6">
            <div className="p-8 rounded-[32px] border bg-card shadow-2xl shadow-primary/5 flex flex-col gap-6">
              <h3 className="text-2xl font-black tracking-tight">Order Summary</h3>
              
              <div className="flex flex-col gap-4 py-4 border-y border-dashed">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Subtotal ({selectedItems.length} items)</span>
                  <span className="font-bold">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Standard Delivery</span>
                  <span>Rs. {deliveryCharges}</span>
                </div>
                {shippingMethod === "COD" && (
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground italic">COD Service Fee</span>
                      <span>Rs. {codCharges}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-end">
                      <span className="text-sm font-black uppercase tracking-widest text-primary">Est. Total</span>
                      <span className="text-4xl font-black tracking-tighter">Rs. {total.toLocaleString()}</span>
                  </div>

                  <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Select Payment Method</span>
                      <div className="grid grid-cols-2 gap-2">
                          <button 
                              onClick={() => setShippingMethod("COD")}
                              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${shippingMethod === "COD" ? "bg-primary/5 border-primary text-primary" : "hover:border-primary/20 opacity-60"}`}
                          >
                              <Truck size={20} />
                              <span className="text-[10px] font-bold uppercase underline-offset-4 decoration-primary">Cash On Delivery</span>
                          </button>
                          <button 
                              onClick={() => setShippingMethod("Stripe")}
                              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${shippingMethod === "Stripe" ? "bg-primary/5 border-primary text-primary" : "hover:border-primary/20 opacity-60"}`}
                          >
                              <CreditCard size={20} />
                              <span className="text-[10px] font-bold uppercase">Stripe / Card</span>
                          </button>
                      </div>
                  </div>

                  <Button 
                      onClick={handleCheckout} 
                      disabled={selectedItems.length === 0}
                      className="h-16 rounded-2xl text-xl font-black gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                      Checkout Now <ShoppingBag size={22} />
                  </Button>
                  <p className="text-[9px] text-center font-black uppercase tracking-[3px] text-muted-foreground/30 italic">Secure Premium Checkout</p>
              </div>
            </div>
          </div>

        </div>
      )}
      
      {/* Fixed Bottom Checkout for Mobile */}
      {items.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t z-50 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Total Amount</span>
                <span className="text-2xl font-black tracking-tighter text-primary">Rs. {total.toLocaleString()}</span>
            </div>
            <Button onClick={handleCheckout} disabled={selectedItems.length === 0} className="h-14 flex-1 rounded-2xl font-black gap-2 text-lg">
                Checkout <ChevronRight size={20} />
            </Button>
          </div>
      )}
    </main>
  );
};

export default CartPage;
