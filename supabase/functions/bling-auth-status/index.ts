import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await supabase
    .from("bling_auth")
    .select("refresh_token, expires_at, last_sync_at, last_sync_summary")
    .eq("id", 1)
    .maybeSingle();

  return new Response(
    JSON.stringify({
      connected: !!data?.refresh_token,
      expires_at: data?.expires_at ?? null,
      last_sync_at: data?.last_sync_at ?? null,
      last_sync_summary: data?.last_sync_summary ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
