"use client";
import React from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const Hero = () => {
  const router = useRouter();
  return (
    <div className="relative overflow-hidden py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4 text-center md:px-8 relative z-10">
        <motion.h1 
          className="mb-6 bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-8xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Minimalist Style <br /> Maximum Comfort
        </motion.h1>
        <motion.p 
          className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Discover a curated collection of premium products designed for the modern lifestyle. Fast shipping, secure payments, and world-class support.
        </motion.p>
        <motion.div 
          className="flex flex-col justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Button size="lg" onClick={() => router.push("/products")} className="rounded-full">Shop Collection</Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/categories")} className="rounded-full">View Categories</Button>
        </motion.div>
      </div>

      {/* Interactive Floating Background Objects */}
      <motion.div 
        className="absolute top-1/2 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10"
        animate={{ 
          y: [0, -50, 0],
          x: [0, 20, 0],
          scale: [1, 1.2, 1] 
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/20 rounded-full blur-3xl -z-10"
        animate={{ 
          y: [0, 50, 0],
          x: [0, -40, 0],
          scale: [1, 1.1, 1] 
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <div className="absolute top-0 -z-20 h-full w-full opacity-30 [background:radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)]" />
    </div>
  );
};

export default Hero;
