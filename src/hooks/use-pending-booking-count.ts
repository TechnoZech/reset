"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { localDateString } from "@/lib/utils";

export function usePendingBookingCount() {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const today = localDateString(new Date());
      const { data, count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("status", "pending")
        .gte("booking_date", today);
      if (error) {
        countRef.current = 0;
        setCount(0);
        return;
      }
      const value = count ?? data?.length ?? 0;
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
