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

  const totalItems =
    cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) ||
    0;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-10 sm:gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className=" p-2 md:hidden hover:bg-accent rounded-lg transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              🛍️ {webData.websiteName}
            </span>
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden items-center gap-6 md:flex text-sm font-medium"></div>

        <div className="flex items-center gap-4">
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
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 220,
              }}
              className="
          fixed
          top-0
          left-0
          z-50
          h-screen
          w-[85%]
          max-w-[320px]
          bg-white
          border-r
          shadow-2xl
          md:hidden
          flex
          flex-col
        "
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b p-5">
                <span className="text-lg font-black tracking-tight">
                  🛍️ {webData.websiteName}
                </span>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              hover:bg-black/5
              transition
            "
                >
                  <X size={20} />
                </button>
              </div>

              {/* Links */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-3">
                  {user ? (
                    <>
                      <Link
                        href={
                          user.role?.toLowerCase() === "user"
                            ? "/user/dashboard"
                            : "/dashboard"
                        }
                        className="
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    p-4
                    font-semibold
                    hover:bg-black
                    hover:text-white
                    transition-all
                    duration-300
                  "
                      >
                        <LayoutDashboard size={18} />
                        Dashboard
                      </Link>

                      <button
                        onClick={async () => {
                          await fetch("/api/auth/logout", {
                            method: "POST",
                          });

                          window.location.href = "/";
                        }}
                        className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-red-200
                    p-4
                    font-semibold
                    text-red-500
                    hover:bg-red-500
                    hover:text-white
                    transition-all
                    duration-300
                  "
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="
                  flex
                  items-center
                  justify-center
                  rounded-2xl
                  bg-black
                  p-4
                  font-semibold
                  text-white
                  shadow-lg
                  hover:scale-[1.02]
                  transition-all
                  duration-300
                "
                    >
                      Login / Register
                    </Link>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t p-4 text-center text-xs text-gray-500">
                © {new Date().getFullYear()} {webData.websiteName}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
