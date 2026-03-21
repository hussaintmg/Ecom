"use client";
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FadeIn, StaggerContainer } from "@/components/Animate";
import { 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  Clock, 
  Package, 
  AlertCircle, 
  MessageSquare,
  HelpCircle,
  Headphones
} from "lucide-react";

export default function ShippingReturnsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-20 flex flex-col gap-24 max-w-5xl">
        
        {/* Hero Section */}
        <FadeIn>
          <header className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
            <div className="p-4 bg-primary/10 text-primary rounded-[32px] shadow-xl shadow-primary/5 border border-primary/10">
              <Truck size={32} />
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter">Shipping & Returns</h1>
            <p className="text-muted-foreground text-lg leading-relaxed font-medium capitalize italic">
              Our high-tier logistical protocols ensure your premium pieces arrive with absolute precision and care.
            </p>
          </header>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* 1. Shipping Policy */}
          <FadeIn className="flex flex-col gap-8 p-10 rounded-[48px] border bg-card/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Truck size={120} />
            </div>
            
            <div className="flex flex-col gap-4">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Logistics Excellence</span>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">Shipping Framework</h2>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="mt-1 p-2 bg-emerald-500/10 text-emerald-600 rounded-xl h-fit">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide">Processing Velocity</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">Orders are authenticated and processed within 24-48 hours. Our fleet operates Monday through Friday.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 p-2 bg-emerald-500/10 text-emerald-600 rounded-xl h-fit">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide">Premium Transit Protection</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">Every shipment is dispatched with high-grade protective packaging and real-time AES-256 encrypted tracking.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 p-2 bg-amber-500/10 text-amber-600 rounded-xl h-fit">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide">Delivery Estimates</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">Expect delivery within 3-5 business days across major metropolitan sectors. Remote zones may require additional logistics time.</p>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* 2. Returns & Refunds */}
          <FadeIn className="flex flex-col gap-8 p-10 rounded-[48px] border bg-card/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <RotateCcw size={120} />
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Consumer Integrity</span>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">Returns Protocol</h2>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="mt-1 p-2 bg-primary/10 text-primary rounded-xl h-fit">
                  <Package size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide">Eligibility Criteria</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">Items must be returned in their original, pristine condition within 14 days of receipt. Tags and seals must remain intact.</p>
                </div>
              </div>

              <div className="flex gap-4 bg-amber-500/5 p-4 rounded-3xl border border-amber-500/10">
                <div className="mt-1 p-2 bg-amber-500/10 text-amber-600 rounded-xl h-fit">
                  <Headphones size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide text-amber-700">Financial Settlements</h4>
                  <p className="text-sm text-amber-700/70 leading-relaxed mt-1 font-bold italic">
                    All payment returns and refund requests require manual verification. Please contact our Administrative or Ownership console directly to initiate a financial settlement.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 p-2 bg-primary/10 text-primary rounded-xl h-fit">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide">Exchange Mechanism</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">Defective arrivals are eligible for immediate premium exchange upon photographic verification by our logistics team.</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </StaggerContainer>

        {/* Contact CTA */}
        <FadeIn>
          <section className="bg-primary text-white p-12 md:p-16 rounded-[64px] shadow-2xl shadow-primary/20 flex flex-col items-center text-center gap-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent)]" />
             <MessageSquare size={48} className="opacity-40" />
             <div className="flex flex-col gap-4 relative z-10">
                <h3 className="text-4xl font-black tracking-tight">Need Logistical Support?</h3>
                <p className="text-primary-foreground/70 max-w-xl mx-auto font-medium">
                  Our elite support team is prepared to handle your enquiries regarding shipments, returns, and premium care.
                </p>
             </div>
             <div className="flex gap-4 relative z-10">
                <a href="/contact" className="bg-white text-primary px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all hover:scale-105">Contact Support</a>
             </div>
          </section>
        </FadeIn>

      </main>

      <Footer />
    </div>
  );
}
