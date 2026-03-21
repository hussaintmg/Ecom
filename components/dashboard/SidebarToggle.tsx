"use client";

import React from "react";
import { Menu } from "lucide-react";

interface SidebarToggleProps {
  onOpen: () => void;
}

const SidebarToggle = ({ onOpen }: SidebarToggleProps) => {
  return (
    <button 
      onClick={onOpen}
      className="p-2 lg:hidden hover:bg-accent rounded-xl transition-colors border shadow-sm bg-background"
    >
      <Menu size={20} />
    </button>
  );
};

export default SidebarToggle;
