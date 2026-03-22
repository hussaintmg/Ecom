"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  LogOut, 
  X, 
  Home, 
} from "lucide-react";
import { NavItem } from "@/constants/navigation";
import { cn } from "@/utils/cn";

interface SidebarProps {
  navItems: NavItem[];
  role: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ navItems, role, isOpen = true, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const [profile, setProfile] = useState<{name: string, profileImage: any} | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchProfile();
    const handleUpdate = () => fetchProfile();
    window.addEventListener("profile-updated", handleUpdate);
    return () => window.removeEventListener("profile-updated", handleUpdate);
  }, []);

  // Sync with window width
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      
      if (desktop && isOpen && onClose) {
        onClose(); // Close mobile overlay when resizing to desktop
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, onClose]);

  // Auto-expand parent if child is active
  useEffect(() => {
    const activeParent = navItems.find(item => 
      item.dropdown?.some(sub => sub.url === pathname)
    );
    if (activeParent && !expandedItems.includes(activeParent.name)) {
      setExpandedItems(prev => [...prev, activeParent.name]);
    }
  }, [pathname, navItems]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (!isDesktop && isOpen && onClose) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-background/80 backdrop-blur-xl border-r shadow-2xl relative z-10">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-muted overflow-hidden border shadow-sm group-hover:scale-110 transition-transform shrink-0 flex items-center justify-center">
             {profile && profile.profileImage?.url ? (
                <img src={profile.profileImage.url} alt="User Avatar" className="w-full h-full object-cover" />
             ) : (
                <span className="text-muted-foreground font-black text-xl">{profile?.name ? profile.name[0] : "A"}</span>
             )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 pr-4">
              <span className="font-bold tracking-tight text-sm truncate">{profile?.name || "Loading..."}</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-primary italic opacity-70">{role}</span>
            </div>
          )}
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-xl lg:hidden transition-colors shrink-0">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">

        {navItems.map((item) => {
          const Icon = item.icon;
          const hasDropdown = item.dropdown && item.dropdown.length > 0;
          const isExpanded = expandedItems.includes(item.name);
          const isActive = pathname === item.url || item.dropdown?.some(sub => sub.url === pathname);

          return (
            <div key={item.name} className="flex flex-col">
              <div 
                onClick={() => {
                  if (hasDropdown) {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      if (!expandedItems.includes(item.name)) {
                        toggleExpand(item.name);
                      }
                    } else {
                      toggleExpand(item.name);
                    }
                  }
                }}
                className="group cursor-pointer"
              >
                {hasDropdown ? (
                  <button className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all relative overflow-hidden cursor-pointer",
                    isActive ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}>
                    <Icon size={18} className={cn("transition-transform", isActive && "scale-110")} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left tracking-tight">{item.name}</span>
                        <ChevronDown size={14} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
                      </>
                    )}
                    {isActive && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                      />
                    )}
                  </button>
                ) : (
                  <Link 
                    href={item.url}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all relative overflow-hidden",
                      isActive ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon size={18} className={cn("transition-transform", isActive && "scale-110")} />
                    {!isCollapsed && <span className="flex-1 tracking-tight">{item.name}</span>}
                    {isActive && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                      />
                    )}
                  </Link>
                )}
              </div>

              {/* Dropdown Items */}
              <AnimatePresence>
                {hasDropdown && isExpanded && !isCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden flex flex-col pl-9 mt-1 space-y-1"
                  >
                    {item.dropdown?.map((sub) => (
                      <Link 
                        key={sub.name}
                        href={sub.url}
                        className={cn(
                          "px-4 py-2 text-xs font-medium rounded-xl transition-all",
                          pathname === sub.url ? "text-primary bg-primary/5 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                        )}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-accent/10">
        <div className="flex flex-col gap-2">
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-tighter text-destructive hover:bg-destructive/10 transition-all",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Collapse Toggle (Desktop Only) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 rounded-full bg-background border shadow-md items-center justify-center hover:scale-110 transition-transform z-100 cursor-pointer"
      >
        <ChevronDown size={12} className={cn("transition-transform duration-500", isCollapsed ? "-rotate-90" : "rotate-90")} />
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isCollapsed ? "80px" : "280px",
          x: isOpen || isDesktop ? 0 : -280
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 h-screen",
          !isOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        {SidebarContent}
      </motion.aside>
    </>
  );
};

export default Sidebar;

