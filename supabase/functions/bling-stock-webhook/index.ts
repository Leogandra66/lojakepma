import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Bling envia webhooks de estoque para este endpoint.
// Protegido por um token na URL (?token=...) validado contra BLING_WEBHOOK_SECRET.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Extrai { code, balance } de diferentes formatos de payload que o Bling v3 pode enviar.
 * Tentamos cobrir os campos mais comuns sem quebrar caso o formato varie.
 */
function extractStock(payload: any): { code: string | null; balance: number | null } {
  if (!payload || typeof payload !== "object") return { code: null, balance: null };

  // Bling v3 normalmente envia { event, data: {...} } ou { retorno: {...} }
  const data = payload.data ?? payload.retorno ?? payload;

  // Possíveis localizações do produto/estoque
  const candidates = [
    data,
    data?.estoque,
    data?.produto,
    data?.estoque?.produto,
    Array.isArray(data?.estoques) ? data.estoques[0] : undefined,
  ].filter(Boolean);

  let code: string | null = null;
  let balance: number | null = null;

  for (const c of candidates) {
    if (code == null) {
      const rawCode = c.codigo ?? c.code ?? c.sku ?? c.produto?.codigo ?? c.produto?.sku;
      if (rawCode != null && String(rawCode).trim() !== "") code = String(rawCode).trim();
    }
    if (balance == null) {
      const rawBalance =
        c.saldoFisicoTotal ??
        c.saldoVirtualTotal ??
        c.saldoFisico ??
        c.saldoVirtual ??
        c.saldo ??
        c.quantidade ??
        c.estoque?.saldoFisicoTotal ??
        c.estoque?.saldo;
      if (rawBalance != null && !Number.isNaN(Number(rawBalance))) {
        balance = Math.max(0, Math.floor(Number(rawBalance)));
      }
    }
  }

  return { code, balance };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Validação do token de segurança
  const expected = Deno.env.get("BLING_WEBHOOK_SECRET");
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("x-webhook-token");
  if (!expected || token !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 2. Ler payload
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    // Bling pode enviar verificação/handshake sem corpo JSON — respondemos 200
    return json({ ok: true, note: "no json body" }, 200);
  }

  const { code, balance } = extractStock(payload);
  console.log("Bling webhook recebido:", JSON.stringify({ code, balance }));

  if (!code) {
    // Sempre 200 para o Bling não reenviar; apenas registramos.
    console.warn("Webhook sem código de produto identificável:", JSON.stringify(payload));
    return json({ ok: true, note: "no product code in payload" }, 200);
  }
  if (balance == null) {
    console.warn(`Webhook do produto ${code} sem saldo no payload.`);
    return json({ ok: true, note: "no balance in payload" }, 200);
  }

  // 3. Atualizar estoque via service role
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: product, error: findErr } = await supabase
    .from("products")
    .select("id, status")
    .eq("bling_code", code)
    .maybeSingle();

  if (findErr) {
    console.error("Erro ao buscar produto:", findErr.message);
    return json({ ok: false, error: "lookup failed" }, 200);
  }
  if (!product) {
    console.warn(`Nenhum produto com bling_code = ${code}.`);
    return json({ ok: true, note: "product not found" }, 200);
  }

  const updates: Record<string, unknown> = {
    stock_quantity: balance,
    stock_synced_at: new Date().toISOString(),
  };
  // Se zerou, marca como indisponível. Se voltou a ter saldo e estava indisponível, reativa.
  if (balance === 0) {
    updates.status = "unavailable";
  } else if (product.status === "unavailable") {
    updates.status = "available";
  }

  const { error: updErr } = await supabase
    .from("products")
    .update(updates)
    .eq("id", product.id);

  if (updErr) {
    console.error("Erro ao atualizar estoque:", updErr.message);
    return json({ ok: false, error: "update failed" }, 200);
  }

  console.log(`Estoque do produto ${code} atualizado para ${balance}.`);
  return json({ ok: true, code, balance }, 200);
});
