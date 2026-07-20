const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");

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
      } catch { /* body may be empty */ }
    }

    console.log("MP webhook:", JSON.stringify({ topic, paymentId }));

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
    if (!mpRes.ok) {
      console.error("Failed to fetch MP payment:", mpRes.status, JSON.stringify(mpPayment));
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalRef = (mpPayment.external_reference as string | undefined) || "";
    const mpStatus = mpPayment.status as string | undefined;
    if (!externalRef) {
      console.error("MP payment without external_reference:", paymentId);
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

    // ===== SPLIT PATH =====
    if (partIndex === 1 || partIndex === 2) {
      const newPartStatus = mapStatus(mpStatus);
      const { data: part } = await supabase
        .from("order_payment_parts")
        .select("*")
        .eq("order_id", orderId).eq("part_index", partIndex)
        .maybeSingle();
      if (!part) {
        console.error("Split part not found", orderId, partIndex);
        return new Response(JSON.stringify({ received: true, matched: false }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (part.status !== newPartStatus) {
        const upd: Record<string, unknown> = { status: newPartStatus, mp_payment_id: String(paymentId) };
        if (newPartStatus === "approved") upd.paid_at = new Date().toISOString();
        await supabase.from("order_payment_parts").update(upd).eq("id", part.id);
      }

      // Check both parts
      const { data: allParts } = await supabase
        .from("order_payment_parts").select("status").eq("order_id", orderId);
      const total = allParts?.length ?? 0;
      const approvedCount = (allParts ?? []).filter((p) => p.status === "approved").length;
      const hasFailed = (allParts ?? []).some((p) => p.status === "rejected" || p.status === "expired");

      if (total === 2 && approvedCount === 2) {
        // Idempotent: only if order not yet paid
        const { data: updated } = await supabase.from("orders")
          .update({ status: "paid" }).eq("id", orderId).neq("status", "paid").select("id").maybeSingle();
        if (updated) {
          try {
            await supabase.functions.invoke("notify-telegram-order", {
              body: { kind: "payment_status", orderId, previousStatus: "pending_payment", newStatus: "paid" },
            });
          } catch (e) { console.error("Telegram notify failed:", e); }
        }
      } else if (hasFailed) {
        try {
          await supabase.functions.invoke("notify-telegram-order", {
            body: { kind: "payment_status", orderId, previousStatus: "pending_payment", newStatus: "partial_failed" },
          });
        } catch (e) { console.error("Telegram partial notify failed:", e); }
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
      console.error("Payment not found for order:", orderId);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const previousStatus = paymentToUpdate.status;
    if (newStatus === previousStatus) {
      return new Response(JSON.stringify({ received: true, matched: true, unchanged: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const paymentUpdate: Record<string, unknown> = { status: newStatus, transaction_nsu: String(paymentId) };
    if (newStatus === "paid") {
      paymentUpdate.paid_at = new Date().toISOString();
      if (mpPayment.transaction_details?.external_resource_url) {
        paymentUpdate.receipt_url = mpPayment.transaction_details.external_resource_url;
      }
    }
    await supabase.from("payments").update(paymentUpdate).eq("id", paymentToUpdate.id);

    if (newStatus === "paid") {
      const orderUpdate: Record<string, unknown> = { status: "paid" };
      const payer = mpPayment.payer ?? {};
      if (payer.email) orderUpdate.customer_email = payer.email;
      const fullName = [payer.first_name, payer.last_name].filter(Boolean).join(" ").trim();
      if (fullName) orderUpdate.customer_name = fullName;
      await supabase.from("orders").update(orderUpdate).eq("id", orderId);
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
    } catch (e) { console.error("Telegram notify failed:", e); }

    return new Response(JSON.stringify({ received: true, matched: true, order_id: orderId, status: newStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error processing MP webhook:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
