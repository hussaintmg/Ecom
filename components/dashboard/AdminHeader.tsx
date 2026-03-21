"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

const AdminHeader = () => {
  const { user } = useAuth();

  return (
    <div className="text-sm font-medium text-muted-foreground italic tracking-tight">
      Welcome back, <span className="text-foreground font-black uppercase text-xs">{user?.name}</span>
    </div>
  );
};

export default AdminHeader;
