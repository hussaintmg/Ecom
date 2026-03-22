"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Define route prefixes that should NOT show the public Navbar/Footer
  const noNavFooterPrefixes = ["/admin", "/owner", "/login", "/register", "/forgot-password", "/reset-password", "/user"];
  const isDashboardOrAuth = noNavFooterPrefixes.some(prefix => pathname.startsWith(prefix));

  if (isDashboardOrAuth) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
