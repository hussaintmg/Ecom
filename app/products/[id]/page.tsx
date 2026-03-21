"use client";
import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import ProductCard from "@/components/products/ProductCard";
import Button from "@/components/ui/Button";
import { Play, Pause, VolumeX, Volume2, Maximize, Star, ShoppingCart, ShieldCheck, Truck, ImagePlus, X, Edit, Trash2, Video } from "lucide-react";
import toast from "@/utils/toast";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* --- Custom Video Player --- */
const CustomVideoPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (playing) videoRef.current.pause();
      else videoRef.current.play();
      setPlaying(!playing);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted(!muted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p =
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen)
        videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className="relative w-full h-full group bg-black rounded-2xl overflow-hidden flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        className="max-h-full max-w-full object-contain"
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
      />

      {/* Huge center play button if paused */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 bg-primary/80 backdrop-blur-md rounded-full flex justify-center items-center text-white hover:bg-primary transition-all shadow-xl hover:scale-110 z-10"
        >
          <Play size={32} className="ml-1" />
        </button>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-10 transition-opacity flex flex-col gap-2">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Buttons */}
        <div className="flex items-center gap-4 text-white">
          <button
            onClick={togglePlay}
            className="hover:text-primary transition-colors"
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={toggleMute}
            className="hover:text-primary transition-colors"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            onClick={handleFullscreen}
            className="ml-auto hover:text-primary transition-colors"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Main Product Viewer --- */
export default function SingleProductPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const {
    data: product,
    isLoading: productLoading,
    error: productError,
  } = useSWR(id ? `/api/products/${id}` : null, fetcher);
  const { data: reviewsData, mutate: mutateReviews } = useSWR(
    id ? `/api/reviews?productId=${id}` : null,
    fetcher,
  );

  const { data: relatedProducts } = useSWR(
    product?.category?._id
      ? `/api/products?category=${product.category._id}`
      : null,
    fetcher,
  );

  const [activeMedia, setActiveMedia] = useState(0);
  const [qty, setQty] = useState(1);
  const [reviewParams, setReviewParams] = useState<any>({
    rating: 5,
    comment: "",
    images: [],
    videos: [],
  });
  const [submitObj, setSubmitObj] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Editing state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);

  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);

  if (productLoading)
    return (
      <div className="min-h-screen flex items-center justify-center animate-pulse font-bold tracking-widest text-muted-foreground uppercase">
        Loading Premium Display...
      </div>
    );
  if (productError || !product)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Product not found.
      </div>
    );

  const reviews = reviewsData || [];

  const media = [...(product.images || []), ...(product.videos || [])];
  const isCurrentVideo =
    media[activeMedia]?.url?.match(/\.(mp4|webm|ogg)$/i) ||
    media[activeMedia]?.publicId?.includes("video");

  // Reviews calculations
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (
          reviews.reduce((a: number, r: any) => a + r.rating, 0) / totalReviews
        ).toFixed(1)
      : 0;

  const handleReviewMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const files = e.target.files;
    if (!files) return;

    setUploadingImage(true);
    try {
      const newMedia: any[] = [];
      for (const file of Array.from(files)) {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: dataUri,
            folder: "ecom/reviews",
            resourceType: type,
          }),
        });
        const data = await res.json();

        if (res.ok && data.url) {
          newMedia.push({ url: data.url, publicId: data.publicId });
        } else {
          toast.error(data.error || `${type} upload failed`);
        }
      }

      if (newMedia.length > 0) {
        if (type === "image") {
          setReviewParams((prev: any) => ({
            ...prev,
            images: [...(prev.images || []), ...newMedia],
          }));
        } else {
          setReviewParams((prev: any) => ({
            ...prev,
            videos: [...(prev.videos || []), ...newMedia],
          }));
        }
      }
    } catch {
      toast.error("Network error during upload");
    }
    setUploadingImage(false);
    if (type === "image" && imageUploadRef.current)
      imageUploadRef.current.value = "";
    if (type === "video" && videoUploadRef.current)
      videoUploadRef.current.value = "";
  };

  const executeReviewAction = async (
    action: "add" | "edit" | "delete",
    reviewId?: string,
  ) => {
    setSubmitObj(true);
    try {
      let res;
      if (action === "add") {
        res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...reviewParams, productId: id }),
        });
      } else if (action === "edit") {
        res = await fetch(`/api/reviews/${reviewId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewParams),
        });
      } else {
        res = await fetch(`/api/reviews/${reviewId}`, {
          method: "DELETE",
        });
      }

      const resData = await res.json();

      if (res.ok) {
        toast.success(resData.message);
        setReviewParams({ rating: 5, comment: "", images: [], videos: [] });
        setEditingReviewId(null);
        mutateReviews(); // Refresh review list
      } else {
        toast.error(resData.error || "Action failed.");
      }
    } catch {
      toast.error("Network error");
    }
    setSubmitObj(false);
  };

  const handleAdd = async () => {
    setAdding(true);
    await addToCart(id, qty);
    setAdding(false);
  };

  // Filter out the current product from related
  const related =
    relatedProducts?.filter((p: any) => p._id !== id).slice(0, 4) || [];

  return (
    <main className="flex-1 container mx-auto px-4 py-12 md:py-20 flex flex-col gap-24">
      {/* 1. PRODUCT SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* Gallery Left Side */}
        <div className="flex flex-col gap-4 relative">
          <div className="aspect-4/5 rounded-3xl bg-muted/30 border shadow-2xl shadow-primary/5 flex items-center justify-center overflow-hidden">
            {media.length > 0 ? (
              isCurrentVideo ? (
                <CustomVideoPlayer src={media[activeMedia].url} />
              ) : (
                <img
                  src={media[activeMedia].url}
                  className="w-full h-full object-cover transition-all duration-700"
                  alt={product.name}
                />
              )
            ) : (
              <span className="font-bold text-muted-foreground opacity-50">
                NO DISPLAY
              </span>
            )}
          </div>

          {/* Carousel Thumbnails */}
          {media.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {media.map((item: any, idx: number) => {
                const isVid =
                  item.url?.match(/\.(mp4|webm|ogg)$/i) ||
                  item.publicId?.includes("video");
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveMedia(idx)}
                    className={`shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer relative ${activeMedia === idx ? "border-primary scale-105 shadow-lg shadow-primary/20" : "border-transparent opacity-60 hover:opacity-100 bg-muted"}`}
                  >
                    {isVid ? (
                      <>
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex justify-center items-center">
                          <Play size={16} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <img
                        src={item.url}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Right Side */}
        <div className="flex flex-col gap-8 py-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                {product.category?.name || "Premium Item"}
              </span>
              {product.stock < 10 && product.stock > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                  {product.stock} Left In Stock
                </span>
              )}
              {product.stock === 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Out of Stock
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground mt-2">
              <div className="flex items-center gap-1.5 text-amber-500">
                <Star size={18} className="fill-amber-500" />
                <span className="text-foreground">{avgRating} Stars</span>
              </div>
              <span>•</span>
              <span className="underline decoration-primary underline-offset-4">
                {totalReviews} Customer Reviews
              </span>
            </div>
          </div>

          <div className="text-4xl font-extrabold text-foreground tracking-tight">
            Rs. {product.price.toLocaleString()}
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          {/* Adding to cart interface */}
          <div className="flex flex-col sm:flex-row items-center gap-4 border-t pt-8 mt-4">
            <div className="flex items-center justify-between border rounded-2xl bg-card w-full sm:w-auto overflow-hidden h-14 shrink-0 transition-colors focus-within:border-primary">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-14 h-full flex items-center justify-center text-xl font-medium hover:bg-muted text-foreground transition-colors"
              >
                -
              </button>
              <span className="w-12 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock, qty + 1))}
                className="w-14 h-full flex items-center justify-center text-xl font-medium hover:bg-muted text-foreground transition-colors"
              >
                +
              </button>
            </div>
            <Button
              onClick={handleAdd}
              className="w-full h-14 rounded-2xl gap-3 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-2xl transition-all"
              disabled={product.stock === 0 || adding}
            >
              {adding ? "Adding..." : product.stock === 0 ? "Out of Stock" : "Add to Cart"}{" "}
              <ShoppingCart size={20} />
            </Button>
          </div>

          {/* Features Guarantees */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10">
              <ShieldCheck size={24} />
              <span className="text-xs font-bold uppercase tracking-widest leading-tight">
                Secure <br />
                Transaction
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/5 text-blue-700 dark:text-blue-400 border border-blue-500/10">
              <Truck size={24} />
              <span className="text-xs font-bold uppercase tracking-widest leading-tight">
                Fast Nxt-Day <br />
                Shipping
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full border-t opacity-30" />

      {/* 2. REVIEWS SECTION */}
      <div className="flex flex-col gap-10">
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          Verified Real Reviews{" "}
          <span className="text-sm font-bold bg-muted text-muted-foreground px-3 py-0.5 rounded-full">
            {totalReviews}
          </span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
          {/* Submission Box */}
          <div
            id="review-form"
            className="flex flex-col gap-6 p-8 rounded-3xl bg-card border shadow-xl shadow-primary/5 h-fit relative"
          >
            <h3 className="text-xl font-bold tracking-tight">
              {editingReviewId ? "Edit Your Review" : "Leave your thoughts!"}
            </h3>

            {editingReviewId && (
              <button
                onClick={() => {
                  setEditingReviewId(null);
                  setReviewParams({
                    rating: 5,
                    comment: "",
                    images: [],
                    videos: [],
                  });
                }}
                className="absolute top-8 right-8 text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            )}

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() =>
                    setReviewParams({ ...reviewParams, rating: star })
                  }
                >
                  <Star
                    size={28}
                    className={`transition-all hover:scale-110 ${reviewParams.rating >= star ? "fill-amber-500 text-amber-500" : "text-muted-foreground opacity-30"}`}
                  />
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <textarea
                className="rounded-2xl border bg-background p-4 text-sm min-h-[120px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Share your experience with this beautiful piece..."
                value={reviewParams.comment}
                onChange={(e) =>
                  setReviewParams({
                    ...reviewParams,
                    comment: e.target.value,
                  })
                }
              />

              {/* Media Attachment Interface */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => imageUploadRef.current?.click()}
                  disabled={uploadingImage}
                  className="p-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl transition-all flex items-center gap-2 shrink-0"
                >
                  <ImagePlus size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {uploadingImage ? "Wait..." : "Images"}
                  </span>
                </button>
                <input
                  type="file"
                  ref={imageUploadRef}
                  accept="image/*"
                  multiple
                  onChange={(e) => handleReviewMediaUpload(e, "image")}
                  className="hidden"
                />

                <button
                  onClick={() => videoUploadRef.current?.click()}
                  disabled={uploadingImage}
                  className="p-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl transition-all flex items-center gap-2 shrink-0"
                >
                  <Video size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {uploadingImage ? "Wait..." : "Videos"}
                  </span>
                </button>
                <input
                  type="file"
                  ref={videoUploadRef}
                  accept="video/*"
                  multiple
                  onChange={(e) => handleReviewMediaUpload(e, "video")}
                  className="hidden"
                />
              </div>

              {/* Preview Attachments */}
              <div className="flex gap-2 flex-wrap">
                {reviewParams.images?.map((img: any, idx: number) => (
                  <div
                    key={`img-${idx}`}
                    className="relative w-14 h-14 rounded-lg border overflow-hidden group/img"
                  >
                    <img
                      src={img.url}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        setReviewParams({
                          ...reviewParams,
                          images: reviewParams.images.filter(
                            (_: any, i: number) => i !== idx,
                          ),
                        })
                      }
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
                {reviewParams.videos?.map((vid: any, idx: number) => (
                  <div
                    key={`vid-${idx}`}
                    className="relative w-14 h-14 rounded-lg border overflow-hidden group/vid bg-black flex items-center justify-center"
                  >
                    <video
                      src={vid.url}
                      className="w-full h-full object-cover opacity-50"
                    />
                    <Video size={14} className="text-white absolute" />
                    <button
                      onClick={() =>
                        setReviewParams({
                          ...reviewParams,
                          videos: reviewParams.videos.filter(
                            (_: any, i: number) => i !== idx,
                          ),
                        })
                      }
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity z-10"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() =>
                executeReviewAction(
                  editingReviewId ? "edit" : "add",
                  editingReviewId || undefined,
                )
              }
              disabled={submitObj}
              className="h-12 rounded-xl font-bold gap-2 mt-2"
            >
              {editingReviewId ? "Update Review" : "Submit Review"}
            </Button>
          </div>

          {/* Display List */}
          <div className="flex flex-col gap-6 pr-2 ">
            {reviews.length > 0 ? (
              reviews.map((r: any, idx: number) => {
                const isOwner =
                  user && ((user.id || user._id) === r.user?._id || (user.id || user._id) === r.user);
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col gap-4 relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex justify-center items-center font-black text-primary uppercase text-sm overflow-hidden shrink-0 border border-primary/10">
                          {r.user?.profileImage?.url ? (
                            <img
                              src={r.user.profileImage.url}
                              alt="User Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : r.user?.name ? (
                            r.user.name[0]
                          ) : (
                            "U"
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-sm leading-none flex items-center gap-2">
                            {r.user?.name || "Anonymous Buyer"}
                            {isOwner && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i < r.rating
                                ? "fill-amber-500"
                                : "text-muted opacity-30"
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-foreground leading-relaxed">
                      {r.comment}
                    </p>

                    {/* Attached Review Media */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {r.images?.map((img: any, i: number) => (
                        <img
                          key={i}
                          src={img.url}
                          className="max-w-[120px] rounded-xl border hover:scale-[1.02] cursor-pointer transition-transform"
                          onClick={() => window.open(img.url, "_blank")}
                        />
                      ))}
                      {r.videos?.map((vid: any, i: number) => (
                        <div
                          key={i}
                          className="relative w-[150px] aspect-video rounded-xl overflow-hidden border bg-black group/v"
                          onClick={() => window.open(vid.url, "_blank")}
                        >
                          <video
                            src={vid.url}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/v:bg-black/40 transition-colors">
                            <Play
                              size={24}
                              className="text-white fill-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Owner Controls */}
                    {isOwner && (
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dashed">
                        <button
                          onClick={() => {
                            setEditingReviewId(r._id);
                            setReviewParams({
                              rating: r.rating,
                              comment: r.comment,
                              images: r.images || [],
                              videos: r.videos || [],
                            });
                            // Scroll up to form
                            window.scrollTo({
                              top: document.getElementById("review-form")
                                ?.offsetTop
                                ? document.getElementById("review-form")!
                                    .offsetTop - 100
                                : 0,
                              behavior: "smooth",
                            });
                          }}
                          className="text-xs text-primary bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold ring-1 ring-primary/20"
                        >
                          <Edit size={14} /> Edit Comment
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this comment?",
                              )
                            )
                              executeReviewAction("delete", r._id);
                          }}
                          disabled={submitObj}
                          className="text-xs text-red-500 bg-red-500/5 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold ring-1 ring-red-500/20"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed bg-card/40 opacity-50 gap-3">
                <Star size={32} />
                <p className="text-sm font-bold">
                  Be the first to review this product!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. RELATED PRODUCTS SECTION */}
      {related.length > 0 && (
        <>
          <div className="w-full border-t opacity-30 mt-6" />
          <div className="flex flex-col gap-8">
            <h2 className="text-3xl font-black tracking-tight">
              You might also like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p: any) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
