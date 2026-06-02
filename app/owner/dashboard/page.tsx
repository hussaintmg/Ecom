"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Package,
  ShoppingBag,
  Grid,
  MessageSquare,
  Users2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductContext";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const OwnerDashboardSummary = () => {
  const [admins, setAdmins] = useState([]);
  const { allAdmins } = useAuth();
  const { products, totalProducts } = useProducts();
  const { data: orders } = useSWR("/api/orders", fetcher);
  const { data: categories } = useSWR("/api/categories", fetcher);
  const { data: enquiries } = useSWR("/api/enquiries", fetcher);

  useEffect(() => {
    const fetchAdmins = async () => {
      const adminsReq = await allAdmins();
      setAdmins(adminsReq);
    };
    fetchAdmins();
  }, []);

  const stats = [
    { name: "Global Products", value: totalProducts, icon: Package },
    { name: "Market Categories", value: categories?.length || 0, icon: Grid },
    { name: "Admins", value: admins?.length || 0, icon: Users2 },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="p-8 rounded-3xl border bg-card flex flex-col gap-4 shadow-sm hover:shadow-2xl transition-all border-primary/10"
            >
              <div className="bg-primary/10 w-10 h-10 flex items-center justify-center rounded-xl text-primary">
                <Icon size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {stat.name}
                </div>
                <div className="text-4xl font-extrabold tracking-tighter mt-1">
                  {stat.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OwnerDashboardSummary;
