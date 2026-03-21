"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "@/utils/toast";

const ResetPasswordPage = () => {
  const { resetPassword, verifyToken } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const validateToken = async () => {
      const tokenParam = params.token as string;
      const data = await verifyToken(tokenParam, "reset");
      if (data) {
        setValid(true);
      } else {
        router.push("/login");
      }
      setLoading(false);
    };
    validateToken();
  }, [params.token, router, verifyToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords must match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(params.token as string, newPassword);
    } catch (err: any) {
      // Error handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground animate-pulse font-medium italic">
        Verifying Reset token...
      </div>
    );
  if (!valid) return null;

  return (
    <div className="flex h-screen items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md p-10 bg-background rounded-3xl border shadow-2xl flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Security Reset
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete the password update process to secure your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              New Secure Password
            </span>
            <input
              type="password"
              className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Confirm New Password
            </span>
            <input
              type="password"
              className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <Button
            disabled={loading}
            type="submit"
            className="rounded-xl h-12 text-base shadow-lg shadow-primary/20"
          >
            Update Password Now
          </Button>
          <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            No Security Code required for final reset verification.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
