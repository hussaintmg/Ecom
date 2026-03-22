"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { Settings, Save, Lock, User, RefreshCw, Camera, X, MapPin, Phone, Building2, ShieldCheck, Trash2, Plus, LogOut } from "lucide-react";
import toast from "@/utils/toast";

export default function ProfilePage() {
  const { user, updateProfile, refreshUser } = useAuth();
  
  const [formData, setFormData] = useState({ name: "" });
  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  const [profileImage, setProfileImage] = useState<any>(null);
  
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ address: "", city: "", postalCode: "00000", country: "Pakistan", phone: "", isDefault: false });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || "" });
      setProfileImage(user.profileImage?.url ? user.profileImage : null);
    }
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

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

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
        const res = await updateProfile({ name: formData.name, profileImage });
        if (res.ok) {
            toast.success("Profile updated successfully!");
        } else {
            toast.error("Failed to update profile");
        }
    } catch {
       toast.error("Network error");
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!passData.old || !passData.new || !passData.confirm) {
          return toast.error("Please fill all password fields.");
      }
      if(passData.new !== passData.confirm) return toast.error("New passwords do not match.");
      
      setSaving(true);
      const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPassword: passData.old, newPassword: passData.new })
      });
      if(res.ok) {
          toast.success("Password secured!");
          setPassData({ old: "", new: "", confirm: "" });
      } else {
          const err = await res.json();
          toast.error(err.error || "Password update failed.");
      }
      setSaving(false);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      const res = await fetch("/api/auth/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addressForm)
      });
      if(res.ok) {
          toast.success("Address added successfully!");
          setShowAddressForm(false);
          setAddressForm({ address: "", city: "", postalCode: "00000", country: "Pakistan", phone: "", isDefault: false });
          refreshUser();
      } else {
          toast.error("Failed to add address.");
      }
      setSaving(false);
  };

  const deleteAddress = async (id: string) => {
      const res = await fetch(`/api/auth/address?id=${id}`, { method: "DELETE" });
      if(res.ok) {
          toast.success("Address removed");
          refreshUser();
      } else {
          toast.error("Failed to delete");
      }
  };

  const setDefaultAddress = async (id: string) => {
      const res = await fetch(`/api/auth/address/set-default`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
      });
      if(res.ok) {
          toast.success("Default address updated");
          refreshUser();
      }
  };

  if (!user) return (
     <div className="min-h-screen p-8 text-center text-muted-foreground animate-pulse font-black uppercase tracking-widest text-xs">Authenticating Vault Access...</div>
  );

  const inputClass = "w-full rounded-xl border bg-background px-5 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-bold";

  return (
    <div className="flex flex-col gap-10 max-w-4xl mx-auto w-full pb-32 pt-8">
      <div className="flex items-center gap-4 px-4 md:px-0">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Settings size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Account Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your personal identity, security credentials, and logistics hubs.</p>
        </div>
      </div>

      <div className="border rounded-3xl bg-card p-6 md:p-8 shadow-sm flex flex-col gap-10">
        
        {/* Profile Avatar Block */}
        <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
           <div className="relative group w-32 h-32 shrink-0">
             <div className="w-full h-full rounded-full border-4 border-background shadow-xl overflow-hidden bg-primary/20 flex justify-center items-center text-5xl font-black text-primary">
                {profileImage ? (
                  <img src={profileImage.url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0]?.toUpperCase() || <User size={48} className="text-muted-foreground opacity-30" />
                )}
             </div>
             
             {/* Hover Upload Button */}
             <button 
               onClick={() => fileInputRef.current?.click()} 
               className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white backdrop-blur-sm z-10"
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
                  className="absolute top-0 right-0 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:scale-110 transition-transform z-20"
                >
                   <X size={12} />
                </button>
             )}

             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
           </div>
           
           <div className="flex flex-col gap-1 pr-6 flex-1">
              <h3 className="font-bold text-xl">{user.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {user.email} <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest font-black">{user.role} Account</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                 <Button onClick={handleSaveProfile} disabled={saving || uploading} className="rounded-xl font-bold h-10 w-full sm:w-auto px-6 whitespace-nowrap shadow-xl shadow-primary/10 text-xs uppercase tracking-widest">
                     {saving ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                     Save Profile
                 </Button>
              </div>
           </div>
        </div>

        <div className="w-full border-t border-dashed" />

        {/* Form Fields: Identity & Security */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="flex flex-col gap-5">
              <h3 className="font-bold text-lg flex items-center gap-2"><User size={18} className="text-primary"/> Personal Details</h3>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Name</span>
                  <input className={inputClass} placeholder="Your visual name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </label>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Address</span>
                  <input className={`${inputClass} italic opacity-60 bg-muted/30 hover:cursor-not-allowed`} value={user.email} readOnly />
              </label>
              
              {/* Optional overall phone number could go here if added to user schema, but address contains phone already. */}
           </div>
           
           <form onSubmit={handleChangePassword} className="flex flex-col gap-5 md:border-l md:pl-8">
              <h3 className="font-bold text-lg flex items-center gap-2"><Lock size={18} className="text-amber-600"/> Security & Password</h3>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Current Password</span>
                  <input type="password" minLength={6} className={inputClass} placeholder="••••••••" value={passData.old} onChange={(e) => setPassData({...passData, old: e.target.value})} />
              </label>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">New Password</span>
                  <input type="password" minLength={6} className={inputClass} placeholder="••••••••" value={passData.new} onChange={(e) => setPassData({...passData, new: e.target.value})} />
              </label>
              <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password</span>
                  <input type="password" minLength={6} className={inputClass} placeholder="••••••••" value={passData.confirm} onChange={(e) => setPassData({...passData, confirm: e.target.value})} />
              </label>
              <div className="flex justify-end pt-2">
                 <Button type="submit" variant="secondary" disabled={saving} className="rounded-xl h-10 px-6 font-bold shadow-sm text-xs uppercase tracking-widest w-full sm:w-auto">Update Password</Button>
              </div>
           </form>
        </div>

        <div className="w-full border-t border-dashed" />

        {/* Form Fields: Logistics Hubs */}
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-lg flex items-center gap-2"><MapPin size={18} className="text-primary"/> Delivery Addresses</h3>
                   <p className="text-xs text-muted-foreground mt-1">Manage where your physical orders will be dispatched.</p>
                </div>
                <button type="button" onClick={() => setShowAddressForm(!showAddressForm)} className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${showAddressForm ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    {showAddressForm ? <><X size={12}/> Cancel</> : <><Plus size={12}/> Add New</>}
                </button>
            </div>

            {showAddressForm && (
                <form onSubmit={handleAddAddress} className="flex flex-col gap-5 p-6 rounded-2xl bg-muted/20 border border-primary/20 animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                       <label className="md:col-span-2 flex flex-col gap-1.5">
                           <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Street Address</span>
                           <input className={inputClass} placeholder="123 Example Street, Block A" value={addressForm.address} onChange={e=>setAddressForm({...addressForm, address:e.target.value})} required/>
                       </label>
                       <label className="flex flex-col gap-1.5">
                           <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">City</span>
                           <input className={inputClass} placeholder="e.g. Islamabad" value={addressForm.city} onChange={e=>setAddressForm({...addressForm, city:e.target.value})} required/>
                       </label>
                       <label className="flex flex-col gap-1.5">
                           <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Phone Number</span>
                           <input className={inputClass} placeholder="e.g. 0300 1234567" value={addressForm.phone} onChange={e=>setAddressForm({...addressForm, phone:e.target.value})} required/>
                       </label>
                    </div>
                    <div className="flex justify-end pt-2">
                       <Button type="submit" disabled={saving} className="rounded-xl h-11 px-8 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/10 w-full sm:w-auto">Save Address</Button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.addresses?.length === 0 && !showAddressForm ? (
                    <div className="md:col-span-2 p-8 text-center border-2 border-dashed rounded-3xl opacity-50 flex flex-col items-center gap-2 bg-muted/20">
                        <MapPin size={24} />
                        <span className="text-xs font-bold uppercase tracking-widest">No deployed addresses found.</span>
                    </div>
                ) : (
                    user.addresses?.map((addr: any, idx: number) => (
                        <div key={idx} className={`p-6 rounded-3xl border-2 transition-all relative group bg-background ${addr.isDefault ? "border-primary shadow-lg shadow-primary/5 bg-primary/5" : "hover:border-primary/30"}`}>
                            {addr.isDefault && (
                                <div className="absolute top-4 right-4 bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                    <ShieldCheck size={10} /> Default
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5 pr-10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"><Building2 size={12}/> {addr.city}</span>
                                <h4 className="font-bold text-[15px] leading-snug">{addr.address}</h4>
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1"><Phone size={12}/> {addr.phone}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dashed opacity-50 group-hover:opacity-100 transition-opacity">
                                {!addr.isDefault && (
                                    <button onClick={()=>setDefaultAddress(addr._id)} className="text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors">Set as Default</button>
                                )}
                                <button onClick={()=>deleteAddress(addr._id)} className={`text-[10px] font-black uppercase tracking-widest text-destructive hover:underline ${addr.isDefault ? '' : 'ml-auto'}`}>Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
