"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import SidebarToggle from "./SidebarToggle";
import { OWNER_NAV } from "@/constants/navigation";

const OwnerLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        navItems={OWNER_NAV} 
        role="Owner" 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <main className="flex-1 overflow-y-auto bg-muted/20 relative">
        <header className="sticky top-0 z-30 flex items-center justify-between p-6 bg-background/50 backdrop-blur-md border-b">
          <div className="flex items-center gap-4">
            <SidebarToggle onOpen={() => setIsSidebarOpen(true)} />
            <h1 className="text-2xl font-black tracking-tighter italic">OWNER <span className="text-primary">COMMAND</span></h1>
          </div>
          <div className="text-sm font-medium text-muted-foreground italic tracking-tight">
            Welcome back, <span className="text-foreground font-black uppercase text-xs">{user?.name}</span>
          </div>
        </header>
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default OwnerLayoutWrapper;
