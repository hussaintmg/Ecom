"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "@/utils/toast";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error("Please login to access this area.");
        router.push("/login");
        return;
      }

      const userRole = role?.toLowerCase();
      if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole || "")) {
        toast.error("Unauthorized: You do not have permission to view this page.");
        router.push("/");
        return;
      }

      if (user.status === "Pending" && userRole !== "owner") {
        toast.warning("Verification Required: Your account is currently pending approval.");
      }
    }
  }, [user, loading, role, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Verifying Identity...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
};

export default AuthGuard;
