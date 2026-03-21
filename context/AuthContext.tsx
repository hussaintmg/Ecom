"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "@/utils/toast";

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
  addresses?: any[];
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  login: (
    loginId: string,
    password: string,
    remember: boolean,
  ) => Promise<void>;
  logout: () => void;
  signup: (formData: any) => Promise<void>;
  forgotPassword: (loginId: string) => Promise<string | null>;
  verifyCode: (
    tokenParam: string,
    token: string,
    code: string,
  ) => Promise<string | null>;
  verifyToken: (jwtToken: string, type: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  allAdmins: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const allAdmins = async () => {
    try {
      const res = await fetch("/api/owner/admins");
      if (res.ok) {
        const data = await res.json();
        return data.admins;
      } else {
        return [];
      }
    } catch (err) {
      return [];
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (
    loginId: string,
    password: string,
    remember: boolean,
  ) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password, remember }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        router.push("/dashboard");
      } else {
        toast.error(data.error || "Login failed");
        throw new Error(data.error);
      }
    } catch (err: any) {
      if (!err.message.includes("Login failed")) {
        // Already toasted above if it was a handled error from API
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.info("Logged out successfully");
      router.push("/login");
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  const signup = async (formData: any) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Account created! You can now sign in.");
        router.push("/login?message=registration_successful");
      } else {
        toast.error(data.error || "Registration failed");
        throw new Error(data.error);
      }
    } catch (err: any) {
      throw err;
    }
  };

  const forgotPassword = async (loginId: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Verification code sent to your email.");
        return data.token;
      } else {
        toast.error(data.error || "Request failed");
        return null;
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
      return null;
    }
  };

  const verifyCode = async (
    tokenParam: string,
    token: string,
    code: string,
  ) => {
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenParam, token, code }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Identity verified.");
        return data.resetToken;
      } else {
        toast.error(data.error || "Invalid code");
        return null;
      }
    } catch (err) {
      toast.error("Verification failed.");
      return null;
    }
  };

  const verifyToken = async (jwtToken: string, type: string) => {
    try {
      const res = await fetch(
        `/api/auth/verify-token?token=${jwtToken}&type=${type}`,
      );
      const data = await res.json();
      if (res.ok) {
        return data;
      } else {
        toast.error(data.error || "Session expired");
        return null;
      }
    } catch (err) {
      return null;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password updated successfully!");
        router.push("/login?message=password_reset_success");
      } else {
        toast.error(data.error || "Reset failed");
        throw new Error(data.error);
      }
    } catch (err: any) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        login,
        logout,
        signup,
        forgotPassword,
        verifyCode,
        verifyToken,
        allAdmins,
        resetPassword,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
