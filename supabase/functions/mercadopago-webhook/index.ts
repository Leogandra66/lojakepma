import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getAccessToken() {
  const prodToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const testToken = Deno.env.get("MERCADO_PAGO_TEST_ACCESS_TOKEN") || prodToken;
  // Webhooks from sandbox payments carry a sandbox signature; we use test token for those.
  // Since we cannot inspect the payload before fetching, prefer test token when available to avoid 401 on sandbox notifications.
  return testToken || prodToken;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] mercadopago-webhook started`, { method: req.method, url: req.url });

  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      console.error(`[${requestId}] Mercado Pago access token missing`);
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type") || "";
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";

    if (req.method === "POST") {
      try {
        const body = await req.json();
        topic = topic || body?.type || body?.topic || "";
        paymentId = paymentId || body?.data?.id || body?.id || "";
        console.log(`[${requestId}] webhook body`, { topic, paymentId, body });
      } catch { /* body may be empty */ }
    }

    console.log(`[${requestId}] MP webhook parsed`, { topic, paymentId });

    if (topic && topic !== "payment") {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!paymentId) {
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const mpPayment = await mpRes.json();
    console.log(`[${requestId}] MP payment fetch`, { status: mpRes.status, id: mpPayment.id, status_detail: mpPayment.status_detail });

    if (!mpRes.ok) {
      console.error(`[${requestId}] Failed to fetch MP payment:`, mpRes.status, JSON.stringify(mpPayment));
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalRef = (mpPayment.external_reference as string | undefined) || "";
    const mpStatus = mpPayment.status as string | undefined;
    console.log(`[${requestId}] external_reference`, externalRef, "mpStatus", mpStatus);

    if (!externalRef) {
      console.error(`[${requestId}] MP payment without external_reference:`, paymentId);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse "orderId" or "orderId:partIndex"
    const [orderId, partIdxStr] = externalRef.split(":");
    const partIndex = partIdxStr ? parseInt(partIdxStr, 10) : null;

    // Map MP status -> internal
    const mapStatus = (s?: string) => {
      if (s === "approved") return "approved";
      if (s === "rejected" || s === "cancelled") return "rejected";
      if (s === "refunded" || s === "charged_back") return "refunded";
      return "pending";
    };

    const webhookMetadata = {
      request_id: requestId,
      mp_payment_id: paymentId,
      mp_status: mpStatus,
      mp_status_detail: mpPayment.status_detail,
      mp_external_reference: externalRef,
      received_at: new Date().toISOString(),
      raw: mpPayment,
    };

    // ===== SPLIT PATH =====
    if (partIndex === 1 || partIndex === 2) {
      const newPartStatus = mapStatus(mpStatus);
      const { data: part } = await supabase
        .from("order_payment_parts")
        .select("*")
        .eq("order_id", orderId).eq("part_index", partIndex)
        .maybeSingle();
      if (!part) {
        console.error(`[${requestId}] Split part not found`, orderId, partIndex);
        return new Response(JSON.stringify({ received: true, matched: false }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (part.status !== newPartStatus) {
        const upd: Record<string, unknown> = {
          status: newPartStatus,
          mp_payment_id: String(paymentId),
          metadata: webhookMetadata,
        };
        if (newPartStatus === "approved") upd.paid_at = new Date().toISOString();
        const { error: partUpdateErr } = await supabase.from("order_payment_parts").update(upd).eq("id", part.id);
        if (partUpdateErr) console.error(`[${requestId}] failed to update part`, partUpdateErr);
      }

      // Check both parts
      const { data: allParts } = await supabase
        .from("order_payment_parts").select("status").eq("order_id", orderId);
      const total = allParts?.length ?? 0;
      const approvedCount = (allParts ?? []).filter((p) => p.status === "approved").length;
      const hasFailed = (allParts ?? []).some((p) => p.status === "rejected" || p.status === "expired");

      console.log(`[${requestId}] split parts status`, { total, approvedCount, hasFailed });

      if (total === 2 && approvedCount === 2) {
        // Idempotent: only if order not yet paid
        const { data: updated } = await supabase.from("orders")
          .update({ status: "paid" }).eq("id", orderId).neq("status", "paid").select("id").maybeSingle();
        if (updated) {
          console.log(`[${requestId}] order marked as paid`, orderId);
          try {
            await supabase.functions.invoke("notify-telegram-order", {
              body: { kind: "payment_status", orderId, previousStatus: "pending_payment", newStatus: "paid" },
            });
          } catch (e) { console.error(`[${requestId}] Telegram notify failed:`, e); }
        }
      } else if (hasFailed) {
        console.log(`[${requestId}] split has failed part`, orderId);
        try {
          await supabase.functions.invoke("notify-telegram-order", {
            body: { kind: "payment_status", orderId, previousStatus: "pending_payment", newStatus: "partial_failed" },
          });
        } catch (e) { console.error(`[${requestId}] Telegram partial notify failed:`, e); }
      }

      return new Response(JSON.stringify({ received: true, matched: true, split: true, part: partIndex, status: newPartStatus }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SINGLE PATH (original behavior) =====
    let newStatus = "pending";
    if (mpStatus === "approved") newStatus = "paid";
    else if (mpStatus === "pending" || mpStatus === "in_process" || mpStatus === "authorized") newStatus = "pending";
    else if (mpStatus === "rejected" || mpStatus === "cancelled") newStatus = "failed";
    else if (mpStatus === "refunded" || mpStatus === "charged_back") newStatus = "refunded";

    const { data: payments } = await supabase
      .from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
    const paymentToUpdate = payments?.[0];
    if (!paymentToUpdate) {
      console.error(`[${requestId}] Payment not found for order:`, orderId);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const previousStatus = paymentToUpdate.status;
    console.log(`[${requestId}] single payment status transition`, { paymentId: paymentToUpdate.id, previousStatus, newStatus });

    if (newStatus === previousStatus) {
      // Still save webhook metadata for traceability
      await supabase.from("payments").update({ metadata: webhookMetadata }).eq("id", paymentToUpdate.id);
      return new Response(JSON.stringify({ received: true, matched: true, unchanged: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentUpdate: Record<string, unknown> = {
      status: newStatus,
      transaction_nsu: String(paymentId),
      mp_status_detail: mpPayment.status_detail || null,
      metadata: webhookMetadata,
    };
    if (newStatus === "paid") {
      paymentUpdate.paid_at = new Date().toISOString();
      if (mpPayment.transaction_details?.external_resource_url) {
        paymentUpdate.receipt_url = mpPayment.transaction_details.external_resource_url;
      }
    }
    const { error: paymentUpdateErr } = await supabase.from("payments").update(paymentUpdate).eq("id", paymentToUpdate.id);
    if (paymentUpdateErr) console.error(`[${requestId}] failed to update payment`, paymentUpdateErr);

    if (newStatus === "paid") {
      const orderUpdate: Record<string, unknown> = { status: "paid" };
      const payer = mpPayment.payer ?? {};
      if (payer.email) orderUpdate.customer_email = payer.email;
      const fullName = [payer.first_name, payer.last_name].filter(Boolean).join(" ").trim();
      if (fullName) orderUpdate.customer_name = fullName;
      const { error: orderUpdateErr } = await supabase.from("orders").update(orderUpdate).eq("id", orderId);
      if (orderUpdateErr) console.error(`[${requestId}] failed to update order`, orderUpdateErr);
    }

    try {
      await supabase.functions.invoke("notify-telegram-order", {
        body: {
          kind: "payment_status",
          orderId, previousStatus, newStatus,
          amount: Number(paymentToUpdate.amount),
          paymentType: paymentToUpdate.payment_type,
          receiptUrl: paymentUpdate.receipt_url ?? paymentToUpdate.receipt_url ?? undefined,
        },
      });
    } catch (e) { console.error(`[${requestId}] Telegram notify failed:`, e); }

    return new Response(JSON.stringify({ received: true, matched: true, order_id: orderId, status: newStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error(`[${requestId}] Error processing MP webhook:`, error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, request_id: requestId }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
