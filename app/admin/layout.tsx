import React from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AdminLayoutWrapper from "@/components/dashboard/AdminLayoutWrapper";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["Admin", "Owner"]}>
      <AdminLayoutWrapper>
        {children}
      </AdminLayoutWrapper>
    </AuthGuard>
  );
}
