"use client";
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import { FadeIn, SlideIn } from "@/components/Animate";
import webData from "@/constants/webData.json";

const ContactPage = () => {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
        setSuccess(true);
        setFormData({ name: "", email: "", subject: "", message: "" });
    }
    setLoading(false);
  };

  return (
    <main className="flex-1 container mx-auto py-32 px-4 md:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <FadeIn>
          <div className="flex flex-col gap-6">
            <h1 className="text-5xl font-extrabold tracking-tight">Let's Connect with Our Support Team</h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Have a question, feedback, or need some help? We're here for you. Our team will get back to you within 24 hours.
            </p>
            <div className="flex flex-col gap-4 text-sm font-medium">
              <div className="flex items-center gap-3">📧 {webData.email}</div>
              <div className="flex items-center gap-3">📞 {webData.phone}</div>
              <div className="flex items-center gap-3">📍 {webData.address}</div>
            </div>
          </div>
        </FadeIn>

        <SlideIn direction="right">
          <div className="p-10 rounded-3xl border bg-card shadow-2xl flex flex-col gap-8">
            {success ? (
              <div className="p-12 text-center flex flex-col gap-4 items-center">
                  <span className="text-4xl">✅</span>
                  <h2 className="text-2xl font-bold">Inquiry Sent!</h2>
                  <p className="text-sm text-muted-foreground">Thank you for Reaching out. We'll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Full Name</span>
                      <input className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary" placeholder="Your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </label>
                  <label className="flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Email Address</span>
                      <input className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary" placeholder="user@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </label>
                </div>
                <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Subject Matter</span>
                    <input className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary" placeholder="e.g. Inquiry about product" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
                </label>
                <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Detailed Message</span>
                    <textarea className="rounded-xl border px-5 py-3 text-sm focus:ring-1 focus:ring-primary h-32" placeholder="Tell us more about your inquiry..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required />
                </label>
                <Button disabled={loading} type="submit" className="h-14 rounded-2xl text-lg shadow-xl shadow-primary/20 hover:shadow-2xl transition-all">
                  {loading ? "Sending your message..." : "Send Message Now"}
                </Button>
              </form>
            )}
          </div>
        </SlideIn>
      </div>
    </main>
  );
};

export default ContactPage;
