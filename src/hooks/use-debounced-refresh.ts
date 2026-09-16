"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useDebouncedRefresh(ms = 400) {
  const router = useRouter();
  const timer = useRef<number>(0);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  return useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => router.refresh(), ms);
  }, [ms, router]);
}
