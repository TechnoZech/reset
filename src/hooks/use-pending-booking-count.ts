"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function usePendingBookingCount() {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { count: next } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      const value = next ?? 0;
      countRef.current = value;
      setCount(value);
    }

    void load();

    const channel = supabase
      .channel("admin-pending-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const status = (payload.new as { status?: string } | null)?.status;
          if (status === "pending") {
            toast.info("New booking received", {
              description: "Open Bookings — newest are at the top.",
              duration: 8000,
            });
          }
          void load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => void load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
