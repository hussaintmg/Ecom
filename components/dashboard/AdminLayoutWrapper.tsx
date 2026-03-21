"use client";

import React, { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import AdminHeader from "./AdminHeader";
import SidebarToggle from "./SidebarToggle";
import { ADMIN_NAV } from "@/constants/navigation";

const AdminLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        navItems={ADMIN_NAV} 
        role="Admin" 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <main className="flex-1 overflow-y-auto bg-muted/20 relative">
        <header className="sticky top-0 z-30 flex items-center justify-between p-6 bg-background/50 backdrop-blur-md border-b">
          <div className="flex items-center gap-4">
            <SidebarToggle onOpen={() => setIsSidebarOpen(true)} />
            <h1 className="text-2xl font-black tracking-tighter italic">ADMIN <span className="text-primary">DASHBOARD</span></h1>
          </div>
          <AdminHeader />
        </header>
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayoutWrapper;
