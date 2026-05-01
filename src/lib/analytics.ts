import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "kepma_session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

type EventType = "page_view" | "product_view" | "add_to_cart" | "begin_checkout";

interface TrackOptions {
  path?: string;
  product_id?: string | null;
  metadata?: Record<string, unknown>;
}

// Skip noisy / admin paths
function shouldSkip(path: string): boolean {
  return path.startsWith("/admin") || path.startsWith("/unsubscribe");
}

export async function track(event: EventType, opts: TrackOptions = {}) {
  try {
    const path = opts.path ?? window.location.pathname;
    if (shouldSkip(path)) return;

    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id ?? null;

    await supabase.from("page_views").insert([{
      event_type: event,
      path,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
      user_id,
      product_id: opts.product_id ?? null,
      metadata: (opts.metadata ?? null) as never,
    }]);
  } catch {
    // never break the UI for analytics
  }
}
