import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { track } from "@/lib/analytics";

export function usePageTracking() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    track("page_view", { path: pathname + (search || "") });
  }, [pathname, search]);
}
