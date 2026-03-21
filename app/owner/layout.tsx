import React from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import OwnerLayoutWrapper from "@/components/dashboard/OwnerLayoutWrapper";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["Owner"]}>
      <OwnerLayoutWrapper>
        {children}
      </OwnerLayoutWrapper>
    </AuthGuard>
  );
}
