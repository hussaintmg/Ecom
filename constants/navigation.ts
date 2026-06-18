import {
  Package,
  Grid,
  ShoppingBag,
  MessageSquare,
  Users,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  UserCheck,
  ReceiptText, // invoice icon
  ShoppingCart, // sale icon
} from "lucide-react";

export interface NavItem {
  name: string;
  url: string;
  icon: any;
  dropdown?: { name: string; url: string }[];
}

export const ADMIN_NAV: NavItem[] = [
  { name: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Products", url: "/admin/products", icon: Package },
  { name: "Inventory", url: "/admin/inventory", icon: Grid },
  { name: "Manual Sell", url: "/admin/sell", icon: ShoppingCart },
  { name: "Credit Sale", url: "/admin/credit-sale", icon: CreditCard },
  { name: "Credit Records", url: "/admin/credit-sales", icon: CreditCard },
  { name: "Repair Bill", url: "/admin/repair-bill", icon: ReceiptText },
  { name: "Invoices", url: "/admin/invoices", icon: ReceiptText },
  { name: "Categories", url: "/admin/categories", icon: Grid },
  { name: "Settings", url: "/admin/settings", icon: Settings },
];

export const OWNER_NAV: NavItem[] = [
  { name: "Owner Dashboard", url: "/owner/dashboard", icon: ShieldCheck },
  {
    name: "Analytics",
    url: "/owner/analytics",
    icon: TrendingUp,
    dropdown: [
      { name: "Sales Reports", url: "/owner/analytics/sales" },
    ],
  },
  { name: "Products", url: "/owner/products", icon: Package },
  { name: "Categories", url: "/owner/categories", icon: Grid },
  { name: "Inventory", url: "/owner/inventory", icon: Grid },
  { name: "Manual Sell", url: "/owner/sell", icon: ShoppingCart },
  { name: "Credit Sale", url: "/owner/credit-sale", icon: CreditCard },
  { name: "Credit Records", url: "/owner/credit-sales", icon: CreditCard },
  { name: "Repair Bill", url: "/owner/repair-bill", icon: ReceiptText },
  { name: "Invoices", url: "/owner/invoices", icon: ReceiptText },
  { name: "Admins", url: "/owner/admins", icon: Users },
  { name: "Setting", url: "/owner/settings", icon: Settings },
];

export const PUBLIC_NAV: NavItem[] = [
  { name: "My Account", url: "/profile", icon: UserCheck },
];

export const USER_NAV: NavItem[] = [
  { name: "Overview", url: "/user/dashboard", icon: LayoutDashboard },
  { name: "Profile Settings", url: "/user/profile", icon: Settings },
  { name: "Back to Store", url: "/", icon: ShoppingBag },
];
