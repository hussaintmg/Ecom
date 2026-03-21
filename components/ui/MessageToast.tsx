"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const MessageToast = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      toast.warning(decodeURIComponent(message));

      // Clean the URL so the toast doesn't show again on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("message");
      const cleanUrl = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(cleanUrl);
    }
  }, [searchParams]);

  return null;
};

export default MessageToast;
