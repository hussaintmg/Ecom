// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Suspense } from "react";
import MessageToast from "@/components/ui/MessageToast";
import { ProductProvider } from "@/context/ProductContext";
import { CategoryProvider } from "@/context/CategoryContext";
import { InvoiceProvider } from "@/context/InvoiceContext"; // Make sure this path is correct

export const metadata: Metadata = {
  title: "Modern ECOM - Full Stack Ecommerce",
  description: "A premium ecommerce platform with high-end architecture.",
};

import { ToastProvider } from "@/components/ui/Toast";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { OrderProvider } from "@/context/OrderContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <AuthProvider>
          <CartProvider>
            <OrderProvider>
              <ProductProvider>
                <CategoryProvider>
                  <InvoiceProvider>
                    <LayoutWrapper>{children}</LayoutWrapper>
                  </InvoiceProvider>
                </CategoryProvider>
              </ProductProvider>
            </OrderProvider>
          </CartProvider>
        </AuthProvider>
        <Suspense>
          <MessageToast />
        </Suspense>
        <ToastProvider position="top-right" />
      </body>
    </html>
  );
}