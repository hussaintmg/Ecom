"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { ShieldCheck, Mail, User, ArrowLeft, RefreshCw } from "lucide-react";

const ForgotPasswordPage = () => {
  const [loginId, setLoginId] = useState("");
  const [useEmail, setUseEmail] = useState(false);
  const { forgotPassword, verifyCode, verifyToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");

  useEffect(() => {
    const handleVerify = async () => {
      if (tokenParam && !token) {
        const data = await verifyToken(tokenParam, "forgot");
        if (data) {
          setToken(data.token);
        }
      }
    };
    handleVerify();
  }, [tokenParam, token, verifyToken]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const newToken = await forgotPassword(loginId);
    if (newToken) {
      router.push("/forgot-password?token=" + newToken);
    }
    setLoading(false);
  };

  const handleCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const resetToken = await verifyCode(tokenParam || "", token || "", code);
    if (resetToken) {
      router.push(`/reset-password/${resetToken}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-background/80 backdrop-blur-xl border border-border/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-10 flex flex-col gap-8 relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <ShieldCheck size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-foreground decoration-primary/30">
                Security Access
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Verify your identity to recover access.
              </p>
            </div>
          </div>

          <div className="relative min-h-[220px]">
            {/* Forgot Form - Always Rendered but can be blurred */}
            <form
              onSubmit={handleForgotSubmit}
              className={`flex flex-col gap-6 transition-all duration-500 ${token ? "blur-md pointer-events-none scale-95 opacity-40" : "opacity-100"}`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                    Target Identity
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseEmail(!useEmail)}
                    className="text-[10px] cursor-pointer font-bold text-primary flex items-center gap-1.5 hover:underline decoration-2 underline-offset-4"
                  >
                    {useEmail ? <User size={12} /> : <Mail size={12} />}
                    Use {useEmail ? "Username" : "Email"} Instead
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none">
                    {useEmail ? (
                      <Mail size={18} strokeWidth={1.5} />
                    ) : (
                      <User size={18} strokeWidth={1.5} />
                    )}
                  </div>
                  <input
                    className="w-full h-14 bg-muted/30 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl pl-14 pr-5 text-sm font-semibold transition-all outline-none"
                    placeholder={
                      useEmail ? "name@domain.com" : "Registration handle"
                    }
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                disabled={loading}
                className="h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                {loading ? (
                  <RefreshCw className="animate-spin mr-2" size={18} />
                ) : null}
                {loading ? "Identifying..." : "Initialize Recovery"}
              </Button>
            </form>

            {/* Code Verification Overlay */}
            <AnimatePresence>
              {token && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-x-0 -inset-y-2 z-20 flex flex-col items-center justify-center"
                >
                  <div className="w-full bg-background/90 backdrop-blur-md border border-primary/20 p-8 rounded-[2rem] shadow-2xl flex flex-col gap-6 text-center">
                    <div className="space-y-2">
                      <h3 className="text-lg font-black tracking-tight">
                        Enter Verification Code
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium px-4 leading-relaxed">
                        A 6-digit cryptographic key was sent to your secure
                        inbox.
                      </p>
                    </div>

                    <form onSubmit={handleCodeVerify} className="space-y-5">
                      <input
                        autoFocus
                        maxLength={6}
                        className="w-full h-16 bg-primary/5 border-2 border-primary/10 focus:border-primary/40 focus:bg-background text-center text-3xl font-black tracking-[0.5em] rounded-2xl outline-none transition-all shadow-inner"
                        placeholder="000000"
                        value={code}
                        onChange={(e) =>
                          setCode(e.target.value.replace(/\D/g, ""))
                        }
                        required
                      />
                      <Button
                        disabled={loading}
                        className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20"
                      >
                        {loading ? "Authenticating..." : "Authorize Access"}
                      </Button>
                    </form>

                    <button
                      onClick={() => {
                        setToken(null);
                        setCode("");
                        router.push("/forgot-password");
                      }}
                      className="text-[10px] uppercase tracking-widest font-black text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
                    >
                      Retrieve New Access Token
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href="/login"
              className="group flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft
                size={14}
                className="group-hover:-translate-x-1 transition-transform"
              />
              Abandon Session & Return to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
