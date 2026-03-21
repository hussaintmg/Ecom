"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { User, Mail, MapPin, Lock, Edit2, Plus, Trash2, ShieldCheck, CheckCircle2, Phone, Building2, UserCheck, KeyRound } from "lucide-react";
import toast from "@/utils/toast";

const ProfilePage = () => {
  const { user, updateProfile, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
      address: "", city: "", postalCode: "", country: "Pakistan", phone: "", isDefault: false
  });

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name, email: user.email });
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateProfile(formData);
    if (res.ok) {
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } else {
      toast.error("Update failed.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if(passData.new !== passData.confirm) return toast.error("Passwords do not match");
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
          toast.error(err.error || "Password update failed");
      }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await fetch("/api/auth/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addressForm)
      });
      if(res.ok) {
          toast.success("Address added!");
          setShowAddressForm(false);
          setAddressForm({ address: "", city: "", postalCode: "", country: "Pakistan", phone: "", isDefault: false });
          refreshUser();
      } else {
          toast.error("Failed to add address");
      }
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

  if (!user) return <div className="min-h-screen flex items-center justify-center animate-pulse font-black text-muted-foreground uppercase tracking-widest text-xs">Authenticating Vault Access...</div>;

  return (
    <main className="flex-1 py-12 px-4 md:px-8 container mx-auto flex flex-col gap-16 max-w-6xl pb-40">
      
      {/* Header Profile Section */}
      <section className="flex flex-col md:flex-row items-center gap-10 bg-card p-10 rounded-[48px] border shadow-2xl shadow-primary/5 relative overflow-hidden group">
          <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-4xl font-black text-primary border-4 border-background shadow-xl shrink-0 group-hover:scale-105 transition-transform">
              {user.profileImage?.url ? <img src={user.profileImage.url} className="w-full h-full object-cover rounded-full" /> : user.name[0].toUpperCase()}
          </div>
          <div className="flex flex-col gap-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4">
                  <h1 className="text-4xl font-black tracking-tighter">{user.name}</h1>
                  <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary/20">{user.role} Member</span>
              </div>
              <p className="text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2 bg-muted/30 px-4 py-1.5 rounded-full w-fit mx-auto md:mx-0 border text-sm"><Mail size={14}/> {user.email}</p>
          </div>
          <div className="md:ml-auto flex flex-col gap-3 w-full md:w-auto">
              <Button onClick={() => setIsEditing(!isEditing)} variant="outline" className="rounded-2xl gap-2 font-bold px-8 h-12 border-2 text-sm uppercase tracking-widest">
                  {isEditing ? "Cancel Discovery" : "Modify Identity"} <Edit2 size={16}/>
              </Button>
          </div>

          <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none -rotate-12">
            <User size={240} />
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Identity & Security */}
          <div className="flex flex-col gap-10">
              
              {/* Form 1: Identity */}
              {isEditing && (
                  <form onSubmit={handleUpdate} className="flex flex-col gap-6 p-10 rounded-[40px] border bg-card/30 animate-in fade-in slide-in-from-bottom-5">
                      <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><UserCheck size={24} className="text-primary"/> Personal Core</h3>
                      <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50 px-1">Full Name</span>
                            <input className="rounded-2xl border px-6 py-4 bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50 px-1">Email Address</span>
                            <input className="rounded-2xl border px-6 py-4 bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none font-bold italic opacity-60" value={formData.email} readOnly />
                        </label>
                      </div>
                      <Button type="submit" className="h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4">Sync Identity Updates</Button>
                  </form>
              )}

              {/* Form 2: Security */}
              <form onSubmit={handleChangePassword} className="flex flex-col gap-6 p-10 rounded-[40px] border bg-card/30 group">
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><KeyRound size={24} className="text-primary"/> Access Security</h3>
                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50 px-1">Existing Password</span>
                        <input type="password" placeholder="••••••••" className="rounded-2xl border px-6 py-4 bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={passData.old} onChange={(e) => setPassData({ ...passData, old: e.target.value })} required />
                    </label>
                    <div className="h-[1px] bg-border border-dashed my-2" />
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50 px-1">New Secure Cipher</span>
                        <input type="password" placeholder="••••••••" className="rounded-2xl border px-6 py-4 bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={passData.new} onChange={(e) => setPassData({ ...passData, new: e.target.value })} required />
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50 px-1">Confirm Cipher</span>
                        <input type="password" placeholder="••••••••" className="rounded-2xl border px-6 py-4 bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={passData.confirm} onChange={(e) => setPassData({ ...passData, confirm: e.target.value })} required />
                    </label>
                  </div>
                  <Button type="submit" variant="secondary" className="h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/5 mt-4">Rotate Access Key</Button>
              </form>
          </div>

          {/* Logistics Bureau */}
          <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-6 p-10 rounded-[40px] border bg-card/30 relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><MapPin size={24} className="text-primary"/> Logistics Bureau</h3>
                    <button onClick={() => setShowAddressForm(!showAddressForm)} className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 ring-1 ring-primary/20">
                        {showAddressForm ? <Trash2 size={20} className="rotate-45" /> : <Plus size={20} />}
                    </button>
                  </div>

                  {showAddressForm && (
                      <form onSubmit={handleAddAddress} className="flex flex-col gap-4 p-6 rounded-3xl bg-background border border-primary/20 shadow-2xl animate-in zoom-in-95">
                         <div className="grid grid-cols-2 gap-4">
                            <label className="col-span-2">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Primary Address Line</span>
                                <input className="w-full rounded-xl border px-4 py-3 text-sm mt-1 focus:ring-1 focus:ring-primary outline-none" placeholder="123 Street Name" value={addressForm.address} onChange={e=>setAddressForm({...addressForm, address:e.target.value})} required/>
                            </label>
                            <label>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1 text-xs">City Hub</span>
                                <input className="w-full rounded-xl border px-4 py-3 text-sm mt-1 focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. Islamabad" value={addressForm.city} onChange={e=>setAddressForm({...addressForm, city:e.target.value})} required/>
                            </label>
                            <label>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Phone Relay</span>
                                <input className="w-full rounded-xl border px-4 py-3 text-sm mt-1 focus:ring-1 focus:ring-primary outline-none" placeholder="+92 XXX XXXXXXX" value={addressForm.phone} onChange={e=>setAddressForm({...addressForm, phone:e.target.value})} required/>
                            </label>
                         </div>
                         <Button type="submit" className="h-12 rounded-xl font-bold uppercase tracking-widest text-xs mt-2">Deploy Address</Button>
                      </form>
                  )}

                  <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {user.addresses?.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center gap-3 opacity-30 italic">
                              <MapPin size={32} />
                              <p className="text-xs font-bold uppercase tracking-widest">No logistics hubs established.</p>
                          </div>
                      ) : (
                          user.addresses?.map((addr: any, idx: number) => (
                              <div key={idx} className={`p-6 rounded-3xl border-2 transition-all relative group/addr bg-card ${addr.isDefault ? "border-primary/40 bg-primary/5 shadow-xl shadow-primary/5" : "hover:border-primary/20"}`}>
                                  {addr.isDefault && (
                                      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/30">
                                          <ShieldCheck size={10}/> Default Hub
                                      </div>
                                  )}
                                  <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2 opacity-40">
                                          <Building2 size={12}/>
                                          <span className="text-[10px] font-black uppercase tracking-widest">{addr.city}</span>
                                      </div>
                                      <p className="font-black text-sm tracking-tight leading-tight">{addr.address}</p>
                                      <div className="flex items-center gap-4 mt-2">
                                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5"><Phone size={10}/> {addr.phone}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dashed opacity-0 group-hover/addr:opacity-100 transition-opacity">
                                          {!addr.isDefault && (
                                              <button onClick={()=>setDefaultAddress(addr._id)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Establish Default</button>
                                          )}
                                          <button onClick={()=>deleteAddress(addr._id)} className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline">Decommission Hub</button>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              <div className="p-10 rounded-[40px] border bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 flex items-center gap-6 border-emerald-500/10 transition-all hover:bg-emerald-500/10">
                  <div className="p-4 bg-emerald-500/20 rounded-2xl">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-[0.2em]">Verified Premium Status</span>
                      <p className="text-[11px] font-bold opacity-60 mt-1 leading-relaxed">Your account is fully synchronized with our premium logistics and security protocols.</p>
                  </div>
              </div>
          </div>

      </div>

    </main>
  );
};

export default ProfilePage;
