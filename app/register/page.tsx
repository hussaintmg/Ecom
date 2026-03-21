"use client";
import React, { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import toast from "@/utils/toast";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Rules: Password must equal Confirm Password AFTER removing first 6 characters from Password
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    if (password !== confirmPassword && password.slice(6) !== confirmPassword) {
      toast.error("Password mismatch. Please check your credentials.");
      setLoading(false);
      return;
    }

    try {
      await signup(formData);
    } catch (err: any) {
      // Error handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-4 bg-muted/20 overflow-y-auto">
      <div className="w-full max-w-lg p-10 mt-40 bg-background rounded-3xl border shadow-2xl flex flex-col gap-8">
        <div className="text-center flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Create Identity
          </h1>
          <p className="text-sm text-muted-foreground">
            Become a part of the premium ecom ecosystem.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Full Name
              </span>
              <input
                className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Username
              </span>
              <input
                className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
              Email Address
            </span>
            <input
              type="email"
              className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Password
              </span>
              <input
                type="password"
                className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Confirm
              </span>
              <input
                type="password"
                className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
            </label>
          </div>
          <Button
            disabled={loading}
            type="submit"
            className="cursor-pointer rounded-xl h-14 text-lg shadow-lg shadow-primary/20 hover:shadow-2xl transition-all"
          >
            {loading ? "Verifying Credentials..." : "Access Identity Now"}
          </Button>
          <div className="text-center text-sm text-muted-foreground flex flex-col gap-2">
            <span>
              Already have a profile?{" "}
              <Link
                href="/login"
                className="font-bold text-foreground hover:underline"
              >
                Sign In Now
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
