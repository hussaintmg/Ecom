"use client";
import React, { useState, useEffect, useRef } from "react";
import { useProducts, MediaItem } from "@/context/ProductContext";
import { useCategories } from "@/context/CategoryContext";
import Button from "@/components/ui/Button";
import { RefreshCw, Upload, ImagePlus, X } from "lucide-react";

interface ProductFormProps {
  initialData?: any;
  onComplete: () => void;
}

const ProductForm = ({ initialData, onComplete }: ProductFormProps) => {
  const { addProduct, editProduct, uploadMedia, deleteMedia } = useProducts();
  const { categories, fetchCategories } = useCategories();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    stock: "",
  });

  const [existingImages, setExistingImages] = useState<MediaItem[]>([]);
  const [pendingImages, setPendingImages] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initialData?._id) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        category: initialData.category?._id || initialData.category || "",
        stock: initialData.stock?.toString() || "",
      });
      setExistingImages(initialData.images || []);
    }
  }, [initialData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Number(formData.stock) < 0) {
      alert("Stock must be 0 or greater");
      return;
    }

    setSubmitting(true);

    // Upload pending images to Cloudinary first
    const uploadedImages: MediaItem[] = [];
    for (const p of pendingImages) {
      if (!p?.file) continue;
      const dataUri = await fileToDataUri(p?.file);
      const res = await uploadMedia(dataUri, "image");
      if (res) uploadedImages.push(res);
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      stock: Number(formData.stock),
      images: [...existingImages, ...uploadedImages],
    };

    let ok = false;
    if (initialData?._id) {
      ok = await editProduct(initialData._id, payload);
    } else {
      ok = await addProduct(payload);
    }

    if (ok) {
      onComplete();
    }
    setSubmitting(false);
  };

  const inputClass =
    "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h3 className="text-xl font-black tracking-tight">
        {initialData?._id ? "Edit Product" : "Create New Product"}
      </h3>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Product Name *
        </span>
        <input
          className={inputClass}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g. Premium T-Shirt"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Description *
        </span>
        <textarea
          className={`${inputClass} min-h-25 resize-y`}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
          placeholder="Describe the product..."
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Category *
          </span>
          <select
            className={inputClass}
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            required
          >
            <option value="">Select Category</option>
            {categories?.map((c: any) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Initial Stock *
          </span>
          <input
            type="number"
            className={inputClass}
            value={formData.stock}
            onChange={(e) =>
              setFormData({ ...formData, stock: e.target.value })
            }
            required
            min={0}
            placeholder="e.g. 50"
          />
        </label>
      </div>

      {/* Images Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Product Images
          </span>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading || submitting}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <ImagePlus size={14} /> Add Images
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        {(existingImages.length > 0 || pendingImages.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {/* Existing images */}
            {existingImages.map((img, idx) => (
              <div
                key={`existing-${idx}`}
                className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted group"
              >
                <img
                  src={img.url}
                  className="w-full h-full object-cover"
                  alt="product"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(idx)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
            {/* Pending images */}
            {pendingImages.map((img, idx) => (
              <div
                key={`pending-${idx}`}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-dashed border-primary bg-primary/5 group"
              >
                <img
                  src={img.url}
                  className="w-full h-full object-cover opacity-80"
                  alt="pending"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full shadow-sm">
                    New
                  </span>
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
            <RefreshCw size={14} className="animate-spin" />
            Uploading to cloud...
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting || uploading}
        className="w-full gap-2"
      >
        {submitting ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {initialData?._id ? "Update Product" : "Create Product"}
      </Button>
    </form>
  );
};

export default ProductForm;
