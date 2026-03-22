import React from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import UserLayoutWrapper from "@/components/dashboard/UserLayoutWrapper";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["User"]}>
      <UserLayoutWrapper>
        {children}
      </UserLayoutWrapper>
    </AuthGuard>
  );
}
