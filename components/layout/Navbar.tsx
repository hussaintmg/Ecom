"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import webData from "@/constants/webData.json";

const Navbar = () => {
  const { cart } = useCart();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const totalItems = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  const navLinks = [
    { name: "Products", href: "/products" },
    { name: "Categories", href: "/categories" },
    { name: "Contact Us", href: "/contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 md:hidden hover:bg-accent rounded-lg transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">🛍️ {webData.websiteName}</span>
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden items-center gap-6 md:flex text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "hover:text-primary transition-colors cursor-pointer",
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            className="relative rounded-full p-2 hover:bg-accent transition-colors cursor-pointer"
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {totalItems}
              </span>
            )}
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {user.role?.toLowerCase() === "user" ? (
                  <div className="flex items-center gap-6">
                    <Link
                      href="/user/dashboard"
                      className="text-sm font-medium hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link
                      href="/orders"
                      className="text-sm font-medium hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <Package size={16} /> My Orders
                    </Link>
                  </div>
                )}
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/";
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer flex items-center gap-1 border-l pl-4"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium hover:text-primary transition-colors cursor-pointer"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed h-screen inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            />
            {/* Sidebar Content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed h-screen inset-y-0 left-0 z-60 w-72 bg-background shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b">
                <span className="text-xl font-bold tracking-tight">
                  🛍️ {webData.websiteName}
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    Navigation
                  </span>
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
                        pathname === link.href
                          ? "bg-primary/5 text-primary"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      {link.name}
                      <ChevronRight size={14} />
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    Account
                  </span>
                  {user ? (
                    <>
                      {user.role?.toLowerCase() === "user" ? (
                        <>
                          <Link
                            href="/user/dashboard"
                            className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
                          >
                            <LayoutDashboard size={18} /> Dashboard
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
                          >
                            <LayoutDashboard size={18} /> Dashboard
                          </Link>
                          <Link
                            href="/admin/orders"
                            className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
                          >
                            <Package size={18} /> My Orders
                          </Link>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          await fetch("/api/auth/logout", { method: "POST" });
                          window.location.href = "/";
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all cursor-pointer w-full text-left"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <User size={18} />
                      Login / Register
                    </Link>
                  )}
                </div>
              </div>

              <div className="p-6 border-t bg-accent/5">
                <p className="text-[10px] text-center text-muted-foreground font-medium">
                  Modern {webData.websiteName} © {new Date().getFullYear()}. Premium Experience.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
