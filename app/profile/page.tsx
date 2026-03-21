"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { User, Lock, MapPin, Phone, Mail, Edit, Trash2, ShieldCheck, ChevronRight, Save, X, Camera, Package, Globe, Hash, Navigation } from "lucide-react";
import toast from "@/utils/toast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", currentPassword: "", newPassword: "", profileImage: "" });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ address: "", city: "", country: "", phone: "", postalCode: "", preciseLocation: "", isDefault: false });
  const [uploading, setUploading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData(prev => ({ ...prev, name: data.name, phone: data.phone || "" }));
      }
    } catch (e) { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdate = async (updateData: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setProfile(data.user);
        setEditingField(null);
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
        fetchProfile();
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch (e) { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      await handleUpdate({ profileImage: dataUri });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleEditAddress = (addr: any) => {
      setNewAddress(addr);
      setShowAddressForm(true);
  };

  if (loading && !profile) return <div className="min-h-screen flex items-center justify-center animate-pulse text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Profile...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 py-12 px-4 md:px-8 container mx-auto flex flex-col gap-12 max-w-5xl pb-32">
        
        {/* Profile Header */}
        <section className="flex flex-col md:flex-row items-center gap-8 bg-card/30 p-8 rounded-[40px] border relative overflow-hidden group shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative w-32 h-32 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-muted group/img">
               {profile?.profileImage?.url ? (
                  <img src={profile.profileImage.url} className="w-full h-full object-cover" />
               ) : <span className="text-4xl font-black text-muted-foreground/30 flex items-center justify-center h-full uppercase">{profile?.name?.[0]}</span>}
               <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all cursor-pointer">
                  <Camera size={24} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
               </label>
               {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-6 h-6 border-b-2 border-white rounded-full animate-spin" /></div>}
            </div>

            <div className="flex-1 flex flex-col gap-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <h1 className="text-4xl font-black tracking-tighter">{profile?.name}</h1>
                  <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest">{profile?.role}</span>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5"><Mail size={14} /> {profile?.email}</span>
                  {profile?.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {profile.phone}</span>}
                  <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> Account Verified</span>
                </div>
            </div>
            
            <div className="relative z-50">
              <Button 
                variant="outline" 
                className="rounded-2xl gap-2 font-bold cursor-pointer"
                onClick={() => router.push("/orders")}
              >
                <Package size={18}/> View All Orders
              </Button>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Settings */}
            <section className="flex flex-col gap-6 p-8 rounded-[40px] border bg-card/30">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><User size={20} className="text-primary"/> Account Details</h3>
                
                <div className="flex flex-col gap-8">
                    {/* Name Change */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Display Name</label>
                        <div className="flex items-center gap-4">
                            {editingField === "name" ? (
                                <>
                                  <input 
                                    className="flex-1 bg-muted/30 border rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-primary outline-none" 
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                  />
                                  <button onClick={() => handleUpdate({name: formData.name})} className="p-2 text-primary hover:bg-primary/5 rounded-lg"><Save size={18}/></button>
                                  <button onClick={() => setEditingField(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg"><X size={18}/></button>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-between group/line">
                                    <span className="text-lg font-bold tracking-tight">{profile.name}</span>
                                    <button onClick={() => setEditingField("name")} className="p-2 opacity-0 group-hover/line:opacity-100 transition-opacity text-muted-foreground hover:text-primary"><Edit size={16}/></button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Password Section */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Lock size={12}/> Security Control</h4>
                        {editingField === "password" ? (
                             <div className="flex flex-col gap-4 mt-2">
                                <input 
                                    type="password" placeholder="Current Password" 
                                    className="bg-muted/30 border rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    value={formData.currentPassword} onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                                />
                                <input 
                                    type="password" placeholder="New Secure Password" 
                                    className="bg-muted/30 border rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})}
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleUpdate({currentPassword: formData.currentPassword, newPassword: formData.newPassword})} className="flex-1 rounded-xl">Update Password</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingField(null)} className="rounded-xl">Cancel</Button>
                                </div>
                             </div>
                        ) : (
                            <button onClick={() => setEditingField("password")} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border hover:border-primary/50 transition-all text-sm font-bold opacity-80 group">
                                <span>Change Account Password</span>
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Address Management */}
            <section className="flex flex-col gap-6 p-8 rounded-[40px] border bg-card/30">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><MapPin size={20} className="text-primary"/> Delivery Address</h3>
                    <button onClick={() => { setShowAddressForm(!showAddressForm); setNewAddress({ address: "", city: "", country: "", phone: "", postalCode: "", preciseLocation: "", isDefault: false }); }} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Add New</button>
                </div>

                <div className="flex flex-col gap-4">
                    {/* List Existing Addresses */}
                    <div className="flex flex-col gap-3">
                        {profile.addresses?.length > 0 ? profile.addresses.map((addr: any, idx: number) => (
                            <div key={idx} className={`p-5 rounded-3xl border transition-all relative group ${addr.isDefault ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-muted/10 hover:border-primary/20"}`}>
                                {addr.isDefault && <span className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-tighter bg-primary text-white px-2 py-0.5 rounded-full shadow-lg shadow-primary/20">Primary</span>}
                                
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditAddress(addr)} className="p-2 bg-background border rounded-lg text-muted-foreground hover:text-primary transition-colors"><Edit size={14}/></button>
                                    <button onClick={() => handleUpdate({deleteAddressId: addr._id})} className="p-2 bg-background border rounded-lg text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                </div>

                                <div className="flex flex-col gap-1 pr-12">
                                    <p className="text-sm font-black italic tracking-tighter opacity-80 uppercase leading-none">{addr.city}, {addr.country}</p>
                                    <p className="text-lg font-black tracking-tighter leading-tight">{addr.address}</p>
                                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mt-1"><Phone size={12}/> {addr.phone}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 border-2 border-dashed rounded-3xl flex flex-col items-center gap-3 opacity-30 italic">
                                <MapPin size={32} />
                                <span className="text-sm font-bold uppercase tracking-widest">No Addresses Saved</span>
                            </div>
                        )}
                    </div>

                    {/* Manual Address Form */}
                    <AnimatePresence>
                        {showAddressForm && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="flex flex-col gap-6 p-6 bg-background rounded-[32px] border shadow-2xl z-20 overflow-hidden"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3">
                                        <div className="relative group">
                                            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <input 
                                                type="text" placeholder="House / Building / Street Address" 
                                                className="w-full bg-muted/30 border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-1 focus:ring-primary" 
                                                value={newAddress.address} onChange={e => setNewAddress({...newAddress, address: e.target.value})}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative group">
                                                <Navigation size={16} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <input placeholder="City" className="w-full bg-muted/30 border rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} />
                                            </div>
                                            <div className="relative group">
                                                <Globe size={16} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <input placeholder="Country" className="w-full bg-muted/30 border rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" value={newAddress.country} onChange={e => setNewAddress({...newAddress, country: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative group">
                                                <Phone size={16} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <input placeholder="Delivery Phone" className="w-full bg-muted/30 border rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} />
                                            </div>
                                            <div className="relative group">
                                                <Hash size={16} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <input placeholder="Postal Code" className="w-full bg-muted/30 border rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none" value={newAddress.postalCode} onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <Navigation size={16} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <textarea 
                                                placeholder="Precise Location Instructions (e.g. Near Mall, 2nd Floor...)" 
                                                rows={3}
                                                className="w-full bg-muted/30 border rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none leading-relaxed" 
                                                value={newAddress.preciseLocation} onChange={e => setNewAddress({...newAddress, preciseLocation: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-1">
                                    <input type="checkbox" id="default-check" checked={newAddress.isDefault} onChange={e => setNewAddress({...newAddress, isDefault: e.target.checked})} className="w-4 h-4 accent-primary" />
                                    <label htmlFor="default-check" className="text-xs font-bold uppercase tracking-widest cursor-pointer select-none">Set as primary address</label>
                                </div>
                                
                                <div className="flex gap-2">
                                    <Button 
                                        className="flex-1 h-14 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-primary/20" 
                                        onClick={() => {
                                            if (!newAddress.address || !newAddress.city || !newAddress.country || !newAddress.phone || !newAddress.postalCode) {
                                                return toast.error("Please fill all required fields");
                                            }
                                            const payload = (newAddress as any)._id 
                                                ? { updateAddress: newAddress } 
                                                : { addressObj: newAddress };
                                            
                                            handleUpdate(payload).then(() => {
                                                setShowAddressForm(false);
                                                setNewAddress({ address: "", city: "", country: "", phone: "", postalCode: "", preciseLocation: "", isDefault: false });
                                            });
                                        }}
                                    >
                                        {(newAddress as any)._id ? "Update Address" : "Save Address"} <ShieldCheck size={20}/>
                                    </Button>
                                    <Button variant="outline" className="rounded-2xl h-14 px-6" onClick={() => setShowAddressForm(false)}><X size={20}/></Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
