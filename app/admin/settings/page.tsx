"use client";
import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { Settings, Save, Lock, User, RefreshCw, Camera, X } from "lucide-react";
import toast from "@/utils/toast";

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState({ name: "", currentPassword: "", password: "", confirmPassword: "" });
  const [profileImage, setProfileImage] = useState<any>(null); // { url, publicId }
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setFormData(f => ({ ...f, name: data.name || "" }));
        setProfileImage(data.profileImage?.url ? data.profileImage : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Data URI
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Post to generic /api/upload
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: dataUri, folder: "ecom/profiles", resourceType: "image" }),
      });
      const data = await res.json();
      
      if (res.ok && data.url) {
        setProfileImage({ url: data.url, publicId: data.publicId });
        toast.success("Image uploaded, click Save to confirm.");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    }
    setUploading(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (formData.password) {
       if (!formData.currentPassword) {
         toast.error("Please enter your current password to change it.");
         return;
       }
       if (formData.password !== formData.confirmPassword) {
         toast.error("New passwords do not match!");
         return;
       }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           name: formData.name,
           currentPassword: formData.currentPassword,
           password: formData.password,
           profileImage
        })
      });
      
      const resData = await res.json();

      if (res.ok) {
         toast.success("Settings updated successfully!");
         setFormData(f => ({ ...f, currentPassword: "", password: "", confirmPassword: "" }));
         // trigger global event to update Sidebar header if needed
         window.dispatchEvent(new Event("profile-updated")); 
      } else {
         toast.error(resData.error || "Failed to update settings");
      }
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  };

  if (loading) return (
     <div className="min-h-screen p-8 text-center text-muted-foreground animate-pulse">Loading settings...</div>
  );

  const inputClass = "w-full rounded-xl border bg-background px-5 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

  return (
    <div className="flex flex-col gap-10 max-w-4xl mx-auto w-full pb-20">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Settings size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your personal profile and security preferences.</p>
        </div>
      </div>

      <div className="border rounded-3xl bg-card p-8 shadow-sm flex flex-col gap-10">
        
        {/* Profile Avatar Block */}
        <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
           <div className="relative group w-32 h-32 shrink-0">
             <div className="w-full h-full rounded-full border-4 border-background shadow-xl overflow-hidden bg-muted flex justify-center items-center">
                {profileImage ? (
                  <img src={profileImage.url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-muted-foreground opacity-30" />
                )}
             </div>
             
             {/* Hover Upload Button */}
             <button 
               onClick={() => fileInputRef.current?.click()} 
               className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white backdrop-blur-sm"
               title="Update Image"
               disabled={uploading}
             >
                {uploading ? <RefreshCw className="animate-spin mb-1" size={20} /> : <Camera size={24} className="mb-1" />}
                <span className="text-[10px] font-bold uppercase tracking-widest">{uploading ? "Uploading" : "Update"}</span>
             </button>
             
             {/* Remove Avatar */}
             {profileImage && !uploading && (
                <button 
                  onClick={() => setProfileImage(null)}
                  className="absolute top-0 right-0 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                   <X size={12} />
                </button>
             )}

             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
           </div>
           
           <div className="flex flex-col gap-1 pr-6">
              <h3 className="font-bold text-lg">Profile Picture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Click inside the circle to upload a new Avatar. Your changes will exclusively appear across all of your verified dashboards instantly.
              </p>
           </div>
        </div>

        <div className="w-full border-t border-dashed" />

        {/* Update Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="flex flex-col gap-5">
              <h3 className="font-bold text-lg flex items-center gap-2"><User size={18} className="text-primary"/> Personal Details</h3>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Name</span>
                  <input className={inputClass} placeholder="Your visual name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </label>
           </div>
           
           <div className="flex flex-col gap-5 md:border-l md:pl-8">
              <h3 className="font-bold text-lg flex items-center gap-2"><Lock size={18} className="text-amber-600"/> Security & Password</h3>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Current Password</span>
                  <input type="password" minLength={6} className={inputClass} placeholder="Required if changing password" value={formData.currentPassword} onChange={(e) => setFormData({...formData, currentPassword: e.target.value})} />
              </label>
              <label className="flex flex-col gap-1.5 mt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">New Password</span>
                  <input type="password" minLength={6} className={inputClass} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </label>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password</span>
                  <input type="password" minLength={6} className={inputClass} placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
              </label>
           </div>
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-dashed">
            <Button 
               className="w-full sm:w-auto px-12 h-14 rounded-2xl gap-2 font-bold shadow-xl shadow-primary/20 text-[15px]" 
               onClick={handleSave}
               disabled={saving || uploading}
            >
               {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
               Save Application Settings
            </Button>
        </div>

      </div>
    </div>
  );
}
