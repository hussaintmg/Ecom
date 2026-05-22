"use client";
import React, { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProductProvider, useProducts, MediaItem } from "@/context/ProductContext";
import { CategoryProvider, useCategories } from "@/context/CategoryContext";
import { StockProvider, useStock } from "@/context/StockContext";
import Button from "@/components/ui/Button";
import { ArrowLeft, RefreshCw, Plus, Save, Package, TrendingUp, Clock, ImagePlus, X } from "lucide-react";

/* ─── Stock History (unchanged) ─── */
const StockHistory = ({ productId }: { productId: string }) => {
  const { logs, loading, fetchLogs } = useStock();

  useEffect(() => {
    fetchLogs(productId);
  }, [productId]);

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/60" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
        <Clock size={28} className="opacity-30" />
        <p className="text-sm">No stock history yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Resulting Stock</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">By</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log._id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 font-bold ${log.change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {log.change > 0 && "+"}{log.change}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-muted-foreground">{log.resultingStock}</td>
                <td className="px-4 py-3 line-clamp-2 max-w-[200px]">{log.description}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleDateString("en-PK", {
                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.performedBy?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {logs.map((log) => (
          <div key={log._id} className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors shadow-sm">
            <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
              log.change > 0 ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
            }`}>
              <TrendingUp size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-bold ${log.change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {log.change > 0 ? "+" : ""}{log.change}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">→ {log.resultingStock} units</span>
              </div>
              <p className="text-sm text-foreground mt-0.5 break-words">{log.description}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground border-t pt-2">
                <span>{new Date(log.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                {log.performedBy && <span>• by {log.performedBy.name}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Main Inner with Image Management ─── */
const ManageProductInner = ({ productId }: { productId: string }) => {
  const router = useRouter();
  const { fetchProductById, editProduct, uploadMedia, deleteMedia } = useProducts();
  const { categories, fetchCategories } = useCategories();
  const { addStockChange, fetchLogs } = useStock();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Stock form
  const [stockChange, setStockChange] = useState("");
  const [stockDesc, setStockDesc] = useState("");
  const [stockLoading, setStockLoading] = useState(false);

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
        category: p.category?._id || p.category || "",
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

  const handleStockUpdate = async () => {
    const amount = Number(stockChange);
    if (!amount || amount <= 0 || !stockDesc.trim()) return;
    setStockLoading(true);
    const ok = await addStockChange(productId, amount, stockDesc);
    if (ok) {
      setStockChange("");
      setStockDesc("");
      await loadProduct();
      await fetchLogs(productId);
    }
    setStockLoading(false);
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
        <div className="flex flex-col gap-6">
          <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Add Stock</h2>
              <span className={`text-2xl font-black ${product.stock > 0 ? "text-emerald-600" : "text-red-600"}`}>{product.stock}</span>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity to Add *</span>
              <input type="number" className={inputClass} value={stockChange} onChange={(e) => setStockChange(e.target.value)} min={1} placeholder="e.g. 50" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</span>
              <textarea className={`${inputClass} min-h-17.5 resize-y`} value={stockDesc} onChange={(e) => setStockDesc(e.target.value)} placeholder="e.g. New shipment from wholesale..." />
            </label>
            <Button onClick={handleStockUpdate} disabled={stockLoading || !stockChange || Number(stockChange) <= 0 || !stockDesc.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              {stockLoading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Confirm Addition
            </Button>
          </div>

          <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
            <h2 className="font-bold text-base">Stock Updates History</h2>
            <StockHistory productId={productId} />
          </div>
        </div>
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