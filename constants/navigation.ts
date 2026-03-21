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
  { name: "Invoices", url: "/admin/invoices", icon: ReceiptText },
  { name: "Categories", url: "/admin/categories", icon: Grid },
  { name: "Orders", url: "/admin/orders", icon: ShoppingBag },
  { name: "Enquiries", url: "/admin/enquiries", icon: MessageSquare },
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
      { name: "User Traffic", url: "/owner/analytics/traffic" },
    ],
  },
  { name: "Products", url: "/owner/products", icon: Package },
  { name: "Categories", url: "/owner/categories", icon: Grid },
  { name: "Inventory", url: "/owner/inventory", icon: Grid },
  { name: "Manual Sell", url: "/owner/sell", icon: ShoppingCart },
  { name: "Invoices", url: "/owner/invoices", icon: ReceiptText },
  { name: "Orders", url: "/admin/orders", icon: ShoppingBag },
  { name: "Enquiries", url: "/owner/enquiries", icon: MessageSquare },
  { name: "Admins", url: "/owner/admins", icon: Users },
  { name: "Setting", url: "/owner/settings", icon: Settings },
];

export const PUBLIC_NAV: NavItem[] = [
  { name: "Storefront", url: "/", icon: ShoppingBag },
  { name: "All Products", url: "/products", icon: Package },
  { name: "Categories", url: "/categories", icon: Grid },
  { name: "My Account", url: "/profile", icon: UserCheck },
];
