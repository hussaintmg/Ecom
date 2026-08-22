"use client";
import React, { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProductProvider, useProducts, MediaItem } from "@/context/ProductContext";
import { CategoryProvider, useCategories } from "@/context/CategoryContext";
import { StockProvider } from "@/context/StockContext";
import Button from "@/components/ui/Button";
import StockManager from "@/components/dashboard/StockManager";
import { ArrowLeft, RefreshCw, Save, Package, ImagePlus, X } from "lucide-react";

/* ─── Main Inner with Image Management ─── */
const ManageProductInner = ({ productId }: { productId: string }) => {
  const router = useRouter();
  const { fetchProductById, editProduct, uploadMedia, deleteMedia } = useProducts();
  const { categories, fetchCategories } = useCategories();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
  });

  // Image management
  const [existingImages, setExistingImages] = useState<MediaItem[]>([]);
  const [pendingImages, setPendingImages] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const newPending: MediaItem[] = [];
    for (const file of Array.from(files)) {
      const preview = await fileToDataUri(file);
      newPending.push({ url: preview, publicId: "", file } as any);
    }
    setPendingImages((prev) => [...prev, ...newPending]);
    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeExistingImage = async (idx: number) => {
    const item = existingImages[idx];
    if (item.publicId) await deleteMedia(item.publicId, "image");
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadProduct = async () => {
    setLoading(true);
    const p = await fetchProductById(productId);
    if (p) {
      setProduct(p);
      setForm({
        name: p.name,
        description: p.description,
        category: typeof p.category === 'object' ? p.category._id : (p.category || ""),
      });
      setExistingImages(p.images || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
    loadProduct();
  }, [productId]);

  const handleSave = async () => {
    if (!form.name || !form.category) return;
    setSaving(true);

    // Upload pending images
    const uploadedImages: MediaItem[] = [];
    for (const p of pendingImages) {
      if (!p?.file) continue;
      const dataUri = await fileToDataUri(p?.file);
      const res = await uploadMedia(dataUri, "image");
      if (res) uploadedImages.push(res);
    }

    const finalImages = [...existingImages, ...uploadedImages];

    const ok = await editProduct(productId, {
      name: form.name,
      description: form.description,
      category: form.category,
      images: finalImages,
    });

    if (ok) {
      await loadProduct(); // reload product with updated images
      setPendingImages([]); // clear pending queue
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col gap-6">
        <div className="h-8 w-48 rounded-lg bg-muted/60" />
        <div className="h-60 rounded-2xl bg-muted/60" />
        <div className="h-40 rounded-2xl bg-muted/60" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <Package size={40} className="text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">Product not found</p>
        <Button onClick={() => router.back()} variant="outline" className="gap-2">
          <ArrowLeft size={14} /> Go Back
        </Button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="flex flex-col gap-8">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl border hover:bg-muted transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground">
            {product.category?.name} •{" "}
            <span className={`font-bold ${product.stock > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {product.stock} in stock
            </span>
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Product Details */}
        <div className="flex flex-col gap-6">
          <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
            <h2 className="font-bold text-base">Product Details</h2>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name *</span>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</span>
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</span>
              <textarea className={`${inputClass} min-h-20 resize-y`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>

            {/* Image Management Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Images</span>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  <ImagePlus size={14} /> Add Images
                </button>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              {(existingImages.length > 0 || pendingImages.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {existingImages.map((img, idx) => (
                    <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted group">
                      <img src={img.url} className="w-full h-full object-cover" alt="product" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {pendingImages.map((img, idx) => (
                    <div key={`pending-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-dashed border-primary bg-primary/5 group">
                      <img src={img.url} className="w-full h-full object-cover opacity-80" alt="pending" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full shadow-sm">New</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingImage(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <RefreshCw size={14} className="animate-spin" /> Uploading to cloud...
                </div>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving || uploading} className="w-full gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Right: Stock Management */}
        <StockManager
          productId={productId}
          currentStock={product.stock}
          onChanged={loadProduct}
        />
      </div>

      {/* Reviews Management */}
      <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm w-full">
        <h2 className="font-bold text-base">Customer Reviews</h2>
        {product.reviews && product.reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {product.reviews.map((r: any, idx: number) => (
              <div key={idx} className="p-4 border rounded-xl bg-background shadow-xs flex flex-col gap-3 relative">
                <div className="flex justify-between items-start border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-black text-xs text-primary">
                      {r.user?.profileImage?.url ? <img src={r.user.profileImage.url} className="w-full h-full object-cover" /> : (r.user?.name ? r.user.name[0].toUpperCase() : "U")}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-none">{r.user?.name || "Unknown User"}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-amber-500 font-bold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-md tracking-widest">{r.rating}/5 Stars</div>
                </div>
                <p className="text-sm font-medium leading-relaxed">"{r.comment}"</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-xl">No reviews have been posted yet.</div>
        )}
      </div>
    </div>
  );
};

const ManageProductPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  return (
    <ProductProvider>
      <CategoryProvider>
        <StockProvider>
          <ManageProductInner productId={id} />
        </StockProvider>
      </CategoryProvider>
    </ProductProvider>
  );
};

export default ManageProductPage;