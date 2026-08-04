import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ configured: false, message: "Token não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check token by calling MP users/me endpoint
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({
        configured: true,
        valid: false,
        status: res.status,
        message: data?.message || "Token inválido ou expirado",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determine environment: test users have site_id === "MLB" and a test_user flag, but the safest
    // heuristic is checking the access token prefix: TEST- tokens are sandbox, APP_USR- are production.
    const isProduction = accessToken.startsWith("APP_USR-");
    const isSandbox = accessToken.startsWith("TEST-");

    return new Response(JSON.stringify({
      configured: true,
      valid: true,
      environment: isProduction ? "production" : isSandbox ? "sandbox" : "unknown",
      site_id: data.site_id,
      nickname: data.nickname,
      email: data.email,
      message: isProduction
        ? "Token de produção detectado"
        : isSandbox
        ? "Token de sandbox/teste detectado. Pagamentos reais não serão processados."
        : "Ambiente do token não pôde ser determinado pelo prefixo",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
