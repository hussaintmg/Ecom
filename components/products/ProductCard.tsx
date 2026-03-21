"use client";
import React, { useState, useRef } from "react";
import Button from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/context/CartContext";
 
 interface ProductCardProps {
   product: any;
 }
 
 const ProductCard = ({ product }: ProductCardProps) => {
   const [mediaIndex, setMediaIndex] = useState(0);
   const [adding, setAdding] = useState(false);
   const { addToCart, fetchCart } = useCart();
   const router = useRouter();

  // Combine images and videos for the carousel
  const allMedia = [
    ...(product.images || []),
    ...(product.videos || []),
  ];

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mediaIndex < allMedia.length - 1) {
      setMediaIndex((p) => p + 1);
    } else {
      setMediaIndex(0);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mediaIndex > 0) {
      setMediaIndex((p) => p - 1);
    } else {
      setMediaIndex(allMedia.length - 1);
    }
  };

  const currentMedia = allMedia[mediaIndex];
  const isVideo = currentMedia?.url?.match(/\.(mp4|webm|ogg)$/i) || currentMedia?.publicId?.includes("video");

  const avgRating: any = product.reviews?.length > 0
    ? (product.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / product.reviews.length).toFixed(1)
    : 0;

  return (
    <div onClick={()=>router.push(`/products/${product._id}`)} className="cursor-pointer group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-3 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
      <Link href={`/products/${product._id}`} className="block relative aspect-square overflow-hidden rounded-xl bg-muted/60">
        {allMedia.length > 0 ? (
          <>
            {isVideo ? (
               <div className="relative w-full h-full">
                  <video src={currentMedia.url} className="h-full w-full object-cover" muted loop playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                     <Play className="text-white opacity-80" size={32} />
                  </div>
               </div>
            ) : (
               <img src={currentMedia.url} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            )}
            
            {allMedia.length > 1 && (
              <>
                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background text-foreground z-10">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background text-foreground z-10">
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {allMedia.map((_, i) => (
                    <div key={i} className={`h-1.5 transition-all rounded-full ${i === mediaIndex ? "w-4 bg-primary" : "w-1.5 bg-white/60"}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="h-full w-full bg-zinc-200 flex items-center justify-center text-muted-foreground font-bold">
            No Image
          </div>
        )}
      </Link>
      
      <div className="flex flex-col gap-1 px-1">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{product.category?.name || "Uncategorized"}</span>
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
             <Star size={10} className="fill-amber-500" />
             {avgRating > 0 ? avgRating : "New"}
          </div>
        </div>
        <Link href={`/products/${product._id}`}>
          <h3 className="font-bold tracking-tight text-foreground transition-colors group-hover:text-primary max-h-12 line-clamp-2 leading-tight mt-1">{product.name}</h3>
        </Link>
        <p className="text-lg font-black tracking-tighter text-foreground mt-1 text-emerald-600">Rs. {product.price.toLocaleString()}</p>
      </div>

      <div className="mt-auto pt-2 px-1">
        <div className="flex gap-2">
           <Button 
             size="sm" 
             className="w-full font-bold shadow-lg shadow-primary/20" 
             disabled={product.stock < 1 || adding}
             onClick={async (e) => {
               e.stopPropagation();
               setAdding(true);
               await addToCart(product._id, 1);
               await fetchCart(); // Ensure global state is hard-synced
               setAdding(false);
             }}
           >
             {product.stock > 0 ? (adding ? "Synchronizing..." : "Add to Cart") : "Out of Stock"}
           </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
