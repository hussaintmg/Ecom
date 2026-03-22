"use client";

import React, { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import SidebarToggle from "./SidebarToggle";
import { USER_NAV } from "@/constants/navigation";
import webData from "@/constants/webData.json";
import { User } from "lucide-react";

const UserLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar 
        navItems={USER_NAV} 
        role="Customer" 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <main className="flex-1 overflow-y-auto bg-muted/20 relative">
        <header className="sticky top-0 z-30 flex items-center justify-between p-6 bg-background/50 backdrop-blur-md border-b">
          <div className="flex items-center gap-4">
            <SidebarToggle onOpen={() => setIsSidebarOpen(true)} />
            <h1 className="text-2xl font-black tracking-tighter italic">MY <span className="text-primary">ACCOUNT</span></h1>
          </div>
          <div className="flex items-center gap-4">
              <a href="/" className="text-sm font-medium hover:text-primary transition-colors hidden md:block">
                View {webData.websiteName} Store
              </a>
              <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-2xl shadow-sm border border-primary/20">
                <User size={18} />
              </div>
          </div>
        </header>
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default UserLayoutWrapper;
