"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";

const LoginPage = () => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginId, password, remember);
    } catch (err: any) {
      // Error handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md p-10 bg-background rounded-3xl border shadow-2xl flex flex-col gap-8">
        <div className="text-center flex flex-col gap-1">
          <h1 className="text-4xl font-extrabold tracking-tight">Identity Login</h1>
          <p className="text-sm text-muted-foreground italic">Sign in to your premium account ecosystem.</p>
        </div>



        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Username or Email</span>
            <input 
              className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
              placeholder="e.g. jdoe123 or jane@doe.com"
              value={loginId} onChange={(e) => setLoginId(e.target.value)} required 
            />
          </label>
          <label className="flex flex-col gap-2">
            <div className="flex justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Access Password</span>
              <Link href="/forgot-password" title="Recover account Access" className="text-xs font-bold text-primary hover:underline hover:text-primary/70 italic">Forgot Password?</Link>
            </div>
            <input 
              type="password"
              className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary"
              placeholder="********"
              value={password} onChange={(e) => setPassword(e.target.value)} required 
            />
          </label>
          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox" id="remember" 
              checked={remember} onChange={(e) => setRemember(e.target.checked)} 
              className="rounded-md border-muted text-primary focus:ring-primary"
            />
            <label htmlFor="remember" className="text-xs font-bold uppercase tracking-widest text-muted-foreground select-none cursor-pointer">Remember me</label>
          </div>
          <Button disabled={loading} type="submit" className="cursor-pointer rounded-xl h-14 text-lg shadow-lg shadow-primary/20 hover:shadow-2xl transition-all">
            {loading ? "Verifying Profile..." : "Sign In Access"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Don't have a profile? <Link href="/register" className="font-bold text-foreground hover:underline">Create Account Now</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
