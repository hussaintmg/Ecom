"use client";
import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookieAccepted");
    if (!accepted) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieAccepted", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[100] md:left-auto md:w-[400px]">
      <div className="p-8 rounded-3xl border bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold">Cookies & Privacy</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We use cookies to enhance your experience, analyze site traffic, and support our premium security features. By continuing, you agree to our policies.
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleAccept} className="flex-1 rounded-xl h-10 text-xs font-bold uppercase tracking-widest">Accept All</Button>
          <Button variant="ghost" onClick={() => setShow(false)} className="text-xs hover:bg-transparent hover:underline px-0 h-10 font-bold uppercase tracking-widest text-muted-foreground">Decline</Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
