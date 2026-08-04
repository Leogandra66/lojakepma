import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CheckoutItem {
  quantity: number;
  price: number; // in cents
  description: string;
}

interface SplitPart {
  partIndex: 1 | 2;
  method: "card" | "pix";
  amountCents: number;
}

const excludeAllExceptPix = {
  excluded_payment_types: [
    { id: "credit_card" },
    { id: "debit_card" },
    { id: "ticket" },
    { id: "atm" },
    { id: "prepaid_card" },
  ],
  installments: 1,
};
const excludeAllExceptCard = {
  excluded_payment_types: [
    { id: "bank_transfer" }, // pix
    { id: "ticket" },
    { id: "atm" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] create-payment-mp started`, { method: req.method, url: req.url });

  try {
    const body = await req.json();
    const { orderId, items, redirectUrl, pixOnly, parts } = body;
    console.log(`[${requestId}] payload`, { orderId, pixOnly: !!pixOnly, split: Array.isArray(parts), itemCount: items?.length });

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      console.error(`[${requestId}] MERCADO_PAGO_ACCESS_TOKEN missing`);
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: orderErr } = await supabase
      .from("orders").select("*").eq("id", orderId).single();
    if (orderErr || !order) {
      console.error(`[${requestId}] order not found`, orderErr);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;
    console.log(`[${requestId}] notification url`, notificationUrl);

    // ============ SPLIT MODE ============
    if (Array.isArray(parts) && parts.length === 2) {
      const partsTyped = parts as SplitPart[];
      console.log(`[${requestId}] split mode`, partsTyped);

      // Clear any previous parts for this order (retry-safe)
      const { error: deletePartsErr } = await supabase.from("order_payment_parts").delete().eq("order_id", orderId);
      if (deletePartsErr) console.error(`[${requestId}] failed to delete old parts`, deletePartsErr);

      const results: Array<{ partIndex: number; method: string; initPoint: string; amountCents: number }> = [];

      for (const part of partsTyped) {
        const label = part.method === "pix" ? "PIX" : "Cartão";
        const preference: Record<string, unknown> = {
          items: [{
            title: `Pedido ${String(orderId).slice(0, 8)} — Parte ${part.partIndex}/2 (${label})`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Math.round(part.amountCents) / 100,
          }],
          external_reference: `${orderId}:${part.partIndex}`,
          notification_url: notificationUrl,
          back_urls: {
            success: `${redirectUrl}?part=${part.partIndex}`,
            failure: `${redirectUrl}?part=${part.partIndex}`,
            pending: `${redirectUrl}?part=${part.partIndex}`,
          },
          auto_return: "approved",
          payment_methods: part.method === "pix" ? excludeAllExceptPix : excludeAllExceptCard,
        };

        console.log(`[${requestId}] creating split part ${part.partIndex}`, preference);
        const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(preference),
        });
        const data = await response.json();
        console.log(`[${requestId}] split part ${part.partIndex} response`, { status: response.status, id: data.id });

        if (!response.ok) {
          console.error(`[${requestId}] MP split part error`, JSON.stringify(data));
          throw new Error(`Mercado Pago error [${response.status}]: ${JSON.stringify(data)}`);
        }
        const initPoint = data.init_point || data.sandbox_init_point || "";

        const { error: insertPartErr } = await supabase.from("order_payment_parts").insert({
          order_id: orderId,
          part_index: part.partIndex,
          method: part.method,
          amount_cents: part.amountCents,
          mp_preference_id: data.id ?? null,
          mp_init_point: initPoint,
          status: "pending",
        });
        if (insertPartErr) console.error(`[${requestId}] failed to insert part ${part.partIndex}`, insertPartErr);

        results.push({ partIndex: part.partIndex, method: part.method, initPoint, amountCents: part.amountCents });
      }

      const { error: updateOrderErr } = await supabase.from("orders")
        .update({ payment_mode: "split", split_config: { parts: partsTyped } })
        .eq("id", orderId);
      if (updateOrderErr) console.error(`[${requestId}] failed to update order split config`, updateOrderErr);

      console.log(`[${requestId}] split mode completed`, results);
      return new Response(JSON.stringify({ mode: "split", parts: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ SINGLE MODE (original) ============
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isHttpLocalhost = redirectUrl.startsWith("http://localhost") || redirectUrl.startsWith("http://127.0.0.1");
    const preference: Record<string, unknown> = {
      items: (items as CheckoutItem[]).map((item) => ({
        title: item.description,
        quantity: item.quantity,
        currency_id: "BRL",
        unit_price: Math.round(item.price) / 100,
      })),
      external_reference: orderId,
      notification_url: notificationUrl,
      back_urls: { success: redirectUrl, failure: redirectUrl, pending: redirectUrl },
    };
    // auto_return requires HTTPS back_urls in production; omit on localhost HTTP to avoid MP 400.
    if (!isHttpLocalhost) preference.auto_return = "approved";

    if (pixOnly) preference.payment_methods = excludeAllExceptPix;

    console.log(`[${requestId}] creating single preference`, preference);
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(preference),
    });
    const data = await response.json();
    console.log(`[${requestId}] single preference response`, { status: response.status, id: data.id });

    if (!response.ok) {
      console.error(`[${requestId}] Mercado Pago error`, JSON.stringify(data));

      // Save error details to the pending payment row for diagnostics
      await supabase.from("payments")
        .update({
          metadata: {
            mp_error: data,
            mp_status: response.status,
            request_id: requestId,
            created_at: new Date().toISOString(),
          },
        })
        .eq("order_id", orderId)
        .eq("status", "pending");

      throw new Error(`Mercado Pago error [${response.status}]: ${JSON.stringify(data)}`);
    }
    const paymentUrl = data.init_point || data.sandbox_init_point || "";

    const { error: paymentUpdateErr } = await supabase.from("payments")
      .update({
        gateway: "mercadopago",
        mp_preference_id: data.id ?? null,
        metadata: {
          mp_preference: { id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point },
          request_id: requestId,
          created_at: new Date().toISOString(),
        },
      })
      .eq("order_id", orderId).eq("status", "pending");
    if (paymentUpdateErr) console.error(`[${requestId}] failed to update payment metadata`, paymentUpdateErr);

    console.log(`[${requestId}] single mode completed`, { paymentUrl, preferenceId: data.id });
    return new Response(JSON.stringify({ payment_url: paymentUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error(`[${requestId}] Error creating Mercado Pago payment:`, error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, request_id: requestId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
