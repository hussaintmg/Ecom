"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import faqs from "@/constants/faqs.json";
import { FadeIn, SlideIn } from "@/components/Animate";

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border/50 rounded-2xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
      >
        <h3 className="text-base md:text-lg font-bold tracking-tight pr-8">{question}</h3>
        <span className="shrink-0 p-2 rounded-full bg-accent/50 text-primary transition-transform duration-300">
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 text-muted-foreground leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FAQPage() {
  return (
    <main className="flex-1 container mx-auto py-24 px-4 md:px-8 max-w-4xl min-h-screen">
      <FadeIn>
        <div className="text-center mb-16 flex flex-col gap-4">
          <span className="text-primary font-black tracking-widest uppercase text-sm">Got Questions?</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Frequently Asked Questions</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            Find everything you need to know to get started, complete transactions, or manage your account effectively.
          </p>
        </div>
      </FadeIn>

      <SlideIn direction="up">
        <div className="flex flex-col gap-4">
          {faqs.map((faq) => (
            <FAQItem key={faq.id} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </SlideIn>
      
      <FadeIn>
        <div className="mt-20 p-10 rounded-3xl bg-primary/5 border border-primary/20 text-center flex flex-col items-center gap-6">
            <h2 className="text-2xl font-bold tracking-tight">Still have questions?</h2>
            <p className="text-muted-foreground">Can't find the answer you're looking for? Please contact our friendly team.</p>
            <a href="/contact" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-105 inline-block">
                Get in Touch
            </a>
        </div>
      </FadeIn>
    </main>
  );
}
