"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import toast from "@/utils/toast";
import { 
  CreditCard, 
  Truck, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Phone, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  Info,
  Package
} from "lucide-react";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  { devtools: false } as any
);

const CheckoutForm = ({ total, items, shippingAddress, onOrderSuccess }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message || "Payment failed");
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      await onOrderSuccess(paymentIntent.id);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <PaymentElement />
      <Button disabled={!stripe || loading} className="h-16 rounded-2xl text-xl font-black w-full shadow-2xl shadow-primary/20">
        {loading ? "Processing Payment..." : `Pay Rs. ${total.toLocaleString()}`}
      </Button>
    </form>
  );
};

const CheckoutPage = () => {
  const { user } = useAuth();
  const { fetchCart } = useCart();
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [method, setMethod] = useState<string>("COD");
  const [loading, setLoading] = useState(true);
  
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    const savedItems = localStorage.getItem("checkout_items");
    const savedMethod = localStorage.getItem("checkout_method");
    if (!savedItems) {
        router.push("/cart");
        return;
    }
    setItems(JSON.parse(savedItems));
    setMethod(savedMethod || "COD");
    setLoading(false);
  }, []);

  useEffect(() => {
      if(user && user.addresses && user.addresses.length > 0 && !selectedAddress) {
          const def = user.addresses.find((a:any) => a.isDefault) || user.addresses[0];
          setSelectedAddress(def);
      }
  }, [user]);

  // Totals Calculation
  const subtotal = items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const deliveryCharges = subtotal > 0 ? 300 : 0;
  const codCharges = method === "COD" && subtotal > 0 ? 50 : 0;
  const total = subtotal + deliveryCharges + codCharges;

  // 1. Fetch Cart ID first
  const [cartId, setCartId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/cart").then(res => res.json()).then(data => setCartId(data._id));
  }, []);

  // 2. Initialize Stripe Intent
  useEffect(() => {
    if (method === "Stripe" && total > 0) {
      fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret))
      .catch(e => toast.error("Payment initialization failed"));
    }
  }, [method, total]);

  const handleOrderSuccess = async (paymentId?: string) => {
    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: items.map(i => ({
                    product: i.product._id,
                    name: i.product.name,
                    price: i.product.price,
                    quantity: i.quantity,
                    image: i.product.images?.[0]?.url
                })),
                itemsPrice: subtotal,
                shippingPrice: deliveryCharges + codCharges,
                totalPrice: total,
                shippingAddress: {
                    address: selectedAddress.address,
                    city: selectedAddress.city,
                    country: selectedAddress.country,
                    phone: selectedAddress.phone,
                    postalCode: selectedAddress.postalCode,
                    preciseLocation: selectedAddress.preciseLocation
                },
                paymentMethod: method,
                paymentId: paymentId || "N/A",
                cartId: cartId || null
            })
        });

        if (res.ok) {
            toast.success("Order placed successfully!");
            localStorage.removeItem("checkout_items");
            localStorage.removeItem("checkout_method");
            await fetchCart();
            router.push("/orders");
        } else {
            const err = await res.json();
            toast.error(err.error || "Order finalization failed");
        }
    } catch (e) { toast.error("Network error"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center animate-pulse text-xs font-black uppercase tracking-widest text-muted-foreground">Authenticating Checkout Session...</div>;
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 py-12 px-4 md:px-8 container mx-auto flex flex-col gap-12 max-w-7xl pb-40">
        
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Secure Checkout</h1>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500"/> AES-256 Grade Transaction Security
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:items-start">
            
            {/* Left: Shipping & Payment */}
            <div className="lg:col-span-7 flex flex-col gap-10">
                
                {/* 1. Address Selection */}
                <section className="flex flex-col gap-6 p-8 rounded-[40px] border bg-card/30">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><MapPin size={22} className="text-primary"/> Shipping Destination</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {user.addresses?.map((addr: any, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedAddress(addr)}
                                className={`p-6 rounded-3xl border-2 transition-all relative cursor-pointer group ${selectedAddress?.address === addr.address ? "bg-primary/5 border-primary shadow-xl shadow-primary/5" : "bg-card hover:border-primary/20"}`}
                            >
                                {selectedAddress?.address === addr.address && <CheckCircle2 size={16} className="absolute top-4 right-4 text-primary" />}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{addr.city}</span>
                                    <span className="font-black text-sm tracking-tight leading-tight">{addr.address}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mt-2"><Phone size={10}/> {addr.phone}</span>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => router.push("/profile")} className="p-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                            <MapPin size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Manage Addresses</span>
                        </button>
                    </div>
                </section>

                {/* 2. Payment Submission */}
                <section className="flex flex-col gap-6 p-8 rounded-[40px] border bg-card/30">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                        {method === "COD" ? <Truck size={22} className="text-primary"/> : <CreditCard size={22} className="text-primary"/>}
                        {method === "COD" ? "Cash On Delivery" : "Digital Payment"}
                    </h3>

                    <div className="bg-background rounded-3xl p-6 border border-dashed">
                        {method === "COD" ? (
                            <div className="flex flex-col gap-6">
                                <div className="flex gap-4 p-4 bg-amber-500/5 text-amber-700 rounded-2xl text-xs font-medium border border-amber-500/10">
                                    <Info className="shrink-0" size={18}/>
                                    <p>Please keep exactly Rs. {total.toLocaleString()} ready. Our rider will contact you upon arrival at {selectedAddress?.city}.</p>
                                </div>
                                <Button onClick={() => handleOrderSuccess()} className="h-16 rounded-2xl text-xl font-black w-full shadow-2xl shadow-primary/20">
                                    Confirm Order (COD)
                                </Button>
                            </div>
                        ) : (
                            clientSecret ? (
                                <Elements options={{ clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
                                    <CheckoutForm total={total} items={items} shippingAddress={selectedAddress} onOrderSuccess={handleOrderSuccess} />
                                </Elements>
                            ) : <div className="p-10 text-center animate-pulse text-xs font-black uppercase tracking-widest opacity-20">Initializing Secure Gateway...</div>
                        )}
                    </div>
                </section>
            </div>

            {/* Right: Order Insight */}
            <div className="lg:col-span-5 flex flex-col gap-8 sticky top-28">
                <section className="p-10 rounded-[48px] border bg-card shadow-2xl shadow-primary/10 flex flex-col gap-10 overflow-hidden relative">
                    <h3 className="text-2xl font-black tracking-tight">Financial Summary</h3>
                    
                    {/* Items Abstract */}
                    <div className="flex flex-col gap-4">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 group">
                                <div className="w-14 h-14 rounded-2xl bg-muted overflow-hidden border">
                                    <img src={item.product?.images?.[0]?.url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm truncate uppercase tracking-tighter leading-none">{item.product.name}</p>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.quantity} Unit(s) × Rs. {item.product.price}</span>
                                </div>
                                <span className="font-black text-sm whitespace-nowrap">Rs. {(item.product.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-4 pt-8 border-t border-dashed">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-muted-foreground uppercase tracking-widest italic opacity-50">Subtotal Ledger</span>
                            <span className="font-black">Rs. {subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Logistics Charge</span>
                            <span className="font-black">Rs. {deliveryCharges}</span>
                        </div>
                        {method === "COD" && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-amber-600 font-bold italic">COD Service Surcharge</span>
                                <span className="font-black">Rs. {codCharges}</span>
                            </div>
                        )}
                        <div className="h-[2px] bg-primary flex-1 mt-4" />
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-black text-primary uppercase tracking-[4px]">Net Total</span>
                            <span className="text-5xl font-black tracking-tighter">Rs. {total.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex items-center gap-4">
                        <ShieldCheck size={32} className="text-emerald-600 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Premium Guarantee</span>
                            <span className="text-[9px] font-bold text-emerald-600/60 leading-tight">Your order is protected under our high-tier consumer protection protocols.</span>
                        </div>
                    </div>

                    <div className="absolute right-0 top-0 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform pointer-events-none">
                        <Package size={240} />
                    </div>
                </section>
                
                <button onClick={() => router.back()} className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft size={16}/> Modify Selection
                </button>
            </div>

        </div>

      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
