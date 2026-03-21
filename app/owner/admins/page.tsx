"use client";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/Toast";
import { RefreshCw, Users2, CheckCircle2, XCircle, Clock } from "lucide-react";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    Approved: {
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
      icon: <CheckCircle2 size={10} />,
    },
    Pending: {
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
      icon: <Clock size={10} />,
    },
    Rejected: {
      cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
      icon: <XCircle size={10} />,
    },
  };
  const { cls, icon } = map[status] ?? {
    cls: "bg-muted text-muted-foreground",
    icon: null,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cls}`}>
      {icon} {status}
    </span>
  );
};

const Skeleton = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-16 rounded-xl bg-muted/60" />
    ))}
  </div>
);

const OwnerAdminsPage = () => {
  const { allAdmins } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdmins = async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await allAdmins();
    setAdmins(data);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(`${id}-${status}`);
    try {
      const res = await fetch("/api/owner/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Admin ${status.toLowerCase()} successfully!`);
        await fetchAdmins(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred while updating status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAdmins(true);
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Manage Admins</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {admins.length} admin{admins.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Skeleton />
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Users2 size={40} className="opacity-30" />
          <p className="text-sm font-medium">No admins found.</p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-hidden rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admins.map((admin: any, idx: number) => (
                  <tr key={admin._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="px-6 py-4 font-semibold">{admin.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{admin.email}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={admin.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={!!actionLoading || admin.status === "Approved"}
                          onClick={() => updateStatus(admin._id, "Approved")}
                          className="gap-1.5"
                        >
                          {actionLoading === `${admin._id}-Approved` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive font-bold gap-1.5"
                          disabled={!!actionLoading || admin.status === "Rejected"}
                          onClick={() => updateStatus(admin._id, "Rejected")}
                        >
                          {actionLoading === `${admin._id}-Rejected` ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <XCircle size={12} />
                          )}
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {admins.map((admin: any, idx: number) => (
              <div
                key={admin._id}
                className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-4"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm">{admin.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-7">{admin.email}</span>
                  </div>
                  <StatusBadge status={admin.status} />
                </div>

                {/* Card actions */}
                <div className="flex gap-2 pt-1 border-t">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={!!actionLoading || admin.status === "Approved"}
                    onClick={() => updateStatus(admin._id, "Approved")}
                  >
                    {actionLoading === `${admin._id}-Approved` ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-destructive font-bold gap-1.5"
                    disabled={!!actionLoading || admin.status === "Rejected"}
                    onClick={() => updateStatus(admin._id, "Rejected")}
                  >
                    {actionLoading === `${admin._id}-Rejected` ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={12} />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerAdminsPage;
