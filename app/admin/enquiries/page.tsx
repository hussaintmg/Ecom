"use client";
import React, { useState } from "react";
import useSWR from "swr";
import { MessageSquare, RefreshCw, Trash2, CheckCircle, Clock, Check } from "lucide-react";
import Button from "@/components/ui/Button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EnquiriesInner = () => {
  const { data: enquiries, mutate, isLoading } = useSWR("/api/enquiries", fetcher);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setProcessing(id);
    await fetch(`/api/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    mutate();
    setProcessing(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this inquiry forever?")) return;
    setProcessing(id);
    await fetch(`/api/enquiries/${id}`, { method: "DELETE" });
    mutate();
    setProcessing(null);
  };

  if (isLoading) return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-muted/60" />)}
     </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <MessageSquare size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Support Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enquiries?.length || 0} messages requiring attention.
          </p>
        </div>
      </div>

      {!enquiries || enquiries.length === 0 ? (
         <div className="flex flex-col items-center py-20 opacity-40 gap-4 border border-dashed rounded-2xl">
           <MessageSquare size={40} />
           <p className="text-sm">Inbox is completely clean!</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enquiries.map((e: any) => (
            <div key={e._id} className="p-5 rounded-2xl border bg-card shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all hover:border-primary/30">
              
              <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                   <h3 className="text-sm font-bold tracking-tight truncate">{e.subject}</h3>
                   <p className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</p>
                 </div>
                 <div className="shrink-0 flex items-center justify-center">
                   {e.status === "Pending" && <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md"><Clock size={10} /> Pending</span>}
                   {e.status === "Reviewed" && <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md"><Check size={10} /> Reviewed</span>}
                   {e.status === "Resolved" && <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md"><CheckCircle size={10} /> Resolved</span>}
                 </div>
              </div>

              <div className="p-3 bg-muted/30 border rounded-xl text-xs text-foreground leading-relaxed flex-1 max-h-32 overflow-y-auto custom-scrollbar">
                 {e.message}
              </div>

              <div className="flex items-center justify-between border-t pt-4 text-xs">
                 <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground truncate">{e.name}</span>
                    <a href={`mailto:${e.email}`} className="text-primary hover:underline truncate">{e.email}</a>
                 </div>
              </div>

              {/* Actions Overlay / Bottom row */}
              <div className="flex gap-2">
                 <select 
                   value={e.status} 
                   onChange={(evt) => handleUpdateStatus(e._id, evt.target.value)}
                   disabled={processing === e._id}
                   className="text-[10px] flex-1 font-bold uppercase tracking-wider bg-background border rounded-lg px-2 py-1.5 focus:border-primary"
                 >
                   <option value="Pending">Pending</option>
                   <option value="Reviewed">Reviewed</option>
                   <option value="Resolved">Resolved</option>
                 </select>
                 <Button 
                   size="sm" 
                   variant="outline" 
                   className="shrink-0 aspect-square p-0 text-destructive border-destructive/20 hover:bg-destructive/10"
                   onClick={() => handleDelete(e._id)}
                   disabled={processing === e._id}
                 >
                    {processing === e._id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminEnquiriesPage() {
   return <EnquiriesInner />;
}
