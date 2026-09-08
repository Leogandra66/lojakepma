import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return html(`<h1>Erro ao autorizar Bling</h1><p>${escape(error)}</p>`, 400);
  }
  if (!code) {
    return html("<h1>Código ausente</h1><p>Bling não retornou um código de autorização.</p>", 400);
  }

  const clientId = Deno.env.get("BLING_CLIENT_ID");
  const clientSecret = Deno.env.get("BLING_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return html("<h1>Credenciais não configuradas</h1>", 500);
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const tokenResp = await fetch("https://api.bling.com.br/Api/v3/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  });

  const tokenData = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok || !tokenData.access_token) {
    console.error("Bling token exchange failed:", tokenResp.status, tokenData);
    return html(
      `<h1>Falha ao trocar código por token</h1><pre>${escape(JSON.stringify(tokenData, null, 2))}</pre>`,
      400,
    );
  }

  const expiresAt = new Date(Date.now() + (Number(tokenData.expires_in ?? 21600) - 60) * 1000);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: upErr } = await supabase
    .from("bling_auth")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", 1);

  if (upErr) {
    console.error("bling_auth update failed:", upErr);
    return html(`<h1>Erro ao salvar tokens</h1><p>${escape(upErr.message)}</p>`, 500);
  }

  return html(`
    <h1>✅ Bling conectado com sucesso</h1>
    <p>Você já pode fechar esta janela e voltar ao painel admin.</p>
    <script>setTimeout(() => window.close(), 2000);</script>
  `);
});

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Bling</title><style>body{font-family:system-ui;padding:2rem;max-width:640px;margin:auto}</style>${body}`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
