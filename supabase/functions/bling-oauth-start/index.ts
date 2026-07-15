import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const clientId = Deno.env.get("BLING_CLIENT_ID");
  if (!clientId) {
    return new Response("BLING_CLIENT_ID não configurado", { status: 500, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? crypto.randomUUID();

  const authUrl = new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("state", state);

  return Response.redirect(authUrl.toString(), 302);
});
