import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BLING_API = "https://api.bling.com.br/Api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const accessToken = await getAccessToken(supabase);

    // Descobrir id do depósito "Geral"
    const depositoGeralId = await findDepositoGeral(accessToken);
    console.log("Depósito Geral id:", depositoGeralId);

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, bling_code, status")
      .not("bling_code", "is", null)
      .neq("bling_code", "");
    if (prodErr) throw prodErr;

    const summary = {
      total: products?.length ?? 0,
      updated: 0,
      not_found: 0,
      errors: 0,
      first_error: null as string | null,
      deposito_geral_id: depositoGeralId,
      details: [] as any[],
    };

    for (const p of products ?? []) {
      try {
        const blingProduct = await fetchProductData(accessToken, p.bling_code as string, depositoGeralId);
        if (blingProduct === null) {
          summary.not_found++;
          summary.details.push({ code: p.bling_code, status: "not_found" });
          continue;
        }
        const updates: Record<string, unknown> = {
          stock_quantity: blingProduct.balance,
          stock_synced_at: new Date().toISOString(),
        };
        if (blingProduct.price !== null) updates.price_b2b = blingProduct.price;
        if (blingProduct.gtin !== null) updates.ean_gtin = blingProduct.gtin;
        if (blingProduct.grossWeight !== null) updates.package_weight_kg = blingProduct.grossWeight;
        if (blingProduct.heightCm !== null) updates.package_height_cm = blingProduct.heightCm;
        if (blingProduct.widthCm !== null) updates.package_width_cm = blingProduct.widthCm;
        if (blingProduct.lengthCm !== null) updates.package_length_cm = blingProduct.lengthCm;
        if (blingProduct.balance === 0) updates.status = "unavailable";
        else if (p.status === "unavailable") updates.status = "in_stock";

        const { error: uErr } = await supabase.from("products").update(updates).eq("id", p.id);
        if (uErr) throw uErr;
        summary.updated++;
        summary.details.push({
          code: p.bling_code,
          balance: blingProduct.balance,
          price_b2b: blingProduct.price,
          ean_gtin: blingProduct.gtin,
          package_weight_kg: blingProduct.grossWeight,
          package_height_cm: blingProduct.heightCm,
          package_width_cm: blingProduct.widthCm,
          package_length_cm: blingProduct.lengthCm,
        });
      } catch (e) {
        summary.errors++;
        const msg = (e as Error).message;
        if (!summary.first_error) summary.first_error = msg;
        summary.details.push({ code: p.bling_code, error: msg });
        console.error("Erro no produto", p.bling_code, e);
      }
      await sleep(350); // Bling permite ~3 req/s
    }

    await supabase
      .from("bling_auth")
      .update({ last_sync_at: new Date().toISOString(), last_sync_summary: summary })
      .eq("id", 1);

    return json({ ok: true, summary });
  } catch (e) {
    console.error("bling-sync-stock error:", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

async function getAccessToken(supabase: any): Promise<string> {
  const { data, error } = await supabase.from("bling_auth").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data?.refresh_token) throw new Error("Bling ainda não foi conectado (sem refresh token).");

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (data.access_token && expiresAt > Date.now() + 30_000) {
    return data.access_token;
  }

  const clientId = Deno.env.get("BLING_CLIENT_ID")!;
  const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
  const basic = btoa(`${clientId}:${clientSecret}`);

  const resp = await fetch(`${BLING_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: data.refresh_token }),
  });
  const tok = await resp.json();
  if (!resp.ok || !tok.access_token) {
    throw new Error(`Falha ao renovar token Bling: ${JSON.stringify(tok)}`);
  }
  const newExpires = new Date(Date.now() + (Number(tok.expires_in ?? 21600) - 60) * 1000).toISOString();
  await supabase
    .from("bling_auth")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? data.refresh_token,
      expires_at: newExpires,
    })
    .eq("id", 1);
  return tok.access_token;
}

async function findDepositoGeral(token: string): Promise<number | null> {
  try {
    const r = await blingFetch(`${BLING_API}/depositos`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!r.ok) {
      console.warn(`GET /depositos ${r.status}: ${await r.text()}`);
      return null;
    }
    const body = await r.json();
    const list = body?.data ?? [];
    const geral = list.find((d: any) => String(d?.descricao ?? "").trim().toLowerCase() === "geral");
    return geral?.id ?? null;
  } catch (e) {
    console.warn("findDepositoGeral falhou:", (e as Error).message);
    return null;
  }
}

async function fetchProductData(
  token: string,
  code: string,
  depositoId: number | null,
): Promise<{
  balance: number;
  price: number | null;
  gtin: string | null;
  grossWeight: number | null;
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
} | null> {
  // 1. Achar produto pelo código (SKU).
  const r = await blingFetch(`${BLING_API}/produtos?codigo=${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`GET /produtos ${r.status}: ${await r.text()}`);
  const body = await r.json();
  const list = body?.data ?? [];
  const prod = Array.isArray(list) ? list.find((x: any) => String(x.codigo) === code) ?? list[0] : null;
  if (!prod?.id) return null;

  // 2. O cadastro detalhado contém preço, EAN/GTIN, peso bruto e dimensões.
  const detailResponse = await blingFetch(`${BLING_API}/produtos/${prod.id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!detailResponse.ok) {
    throw new Error(`GET /produtos/${prod.id} ${detailResponse.status}: ${await detailResponse.text()}`);
  }
  const detailBody = await detailResponse.json();
  const detail = detailBody?.data ?? {};
  const price = positiveOrZero(detail.preco ?? prod.preco);
  const gtinDigits = String(detail.gtin ?? "").replace(/\D/g, "");
  const gtin = [8, 12, 13, 14].includes(gtinDigits.length) ? gtinDigits : null;
  const grossWeight = positiveOrNull(detail.pesoBruto);
  const dimensions = detail.dimensoes ?? {};
  const heightCm = dimensionToCm(dimensions.altura);
  const widthCm = dimensionToCm(dimensions.largura);
  const lengthCm = dimensionToCm(dimensions.profundidade ?? dimensions.comprimento);

  // 3. Consultar saldo, preferindo o depósito Geral quando conhecido.
  const saldosUrl = depositoId
    ? `${BLING_API}/estoques/saldos?idsProdutos[]=${prod.id}&idsDepositos[]=${depositoId}`
    : `${BLING_API}/estoques/saldos?idsProdutos[]=${prod.id}`;
  const s = await blingFetch(saldosUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!s.ok) {
    const inline = prod?.estoque?.saldoVirtualTotal ?? prod?.estoque?.saldoFisico;
    if (inline != null) {
      return {
        balance: Math.max(0, Math.floor(Number(inline))),
        price,
        gtin,
        grossWeight,
        heightCm,
        widthCm,
        lengthCm,
      };
    }
    throw new Error(`GET /estoques/saldos ${s.status}: ${await s.text()}`);
  }
  const sb = await s.json();
  const items = sb?.data ?? [];

  // A resposta pode vir como [{ produto:{id}, depositos:[{id,saldoFisico,saldoVirtual}] }]
  // ou já filtrada. Extrair o saldo do depósito Geral quando presente.
  let saldo: number | null = null;
  for (const it of items) {
    const deps = it?.depositos ?? (it?.saldoFisico != null ? [it] : []);
    for (const d of deps) {
      if (depositoId && d?.id && Number(d.id) !== Number(depositoId)) continue;
      const v = d?.saldoFisico ?? d?.saldoVirtual ?? d?.saldoFisicoTotal ?? d?.saldoVirtualTotal;
      if (v != null) {
        saldo = Number(v);
        break;
      }
    }
    if (saldo != null) break;
  }
  if (saldo == null) return null;
  return {
    balance: Math.max(0, Math.floor(saldo)),
    price,
    gtin,
    grossWeight,
    heightCm,
    widthCm,
    lengthCm,
  };
}

function positiveOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return value != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function positiveOrZero(value: unknown): number | null {
  const parsed = Number(value);
  return value != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function dimensionToCm(value: unknown): number | null {
  const parsed = positiveOrNull(value);
  if (parsed === null) return null;
  // O cadastro do Bling já traz altura, largura e comprimento em centímetros
  // (ex.: 18, 51, 110). A flag unidadeMedida é inconsistente entre cadastros e
  // nunca deve causar conversão. Só valores abaixo de 1 cm são cadastros em
  // metros (ex.: 0.15 = 15 cm) e continuam multiplicados por 100.
  if (parsed < 1) return parsed * 100;
  return parsed;
}

let lastBlingRequestAt = 0;

async function blingFetch(input: string, init: RequestInit): Promise<Response> {
  const waitMs = Math.max(0, 350 - (Date.now() - lastBlingRequestAt));
  if (waitMs > 0) await sleep(waitMs);
  lastBlingRequestAt = Date.now();
  return fetch(input, init);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
