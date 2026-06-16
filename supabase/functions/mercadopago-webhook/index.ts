const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mercado Pago sends the notification id either in the query string or body.
    const url = new URL(req.url);
    let topic = url.searchParams.get("topic") || url.searchParams.get("type") || "";
    let paymentId =
      url.searchParams.get("data.id") || url.searchParams.get("id") || "";

    if (req.method === "POST") {
      try {
        const body = await req.json();
        topic = topic || body?.type || body?.topic || "";
        paymentId = paymentId || body?.data?.id || body?.id || "";
      } catch {
        // body may be empty; rely on query params
      }
    }

    console.log("Mercado Pago webhook received:", JSON.stringify({ topic, paymentId }));

    // We only care about payment notifications
    if (topic && topic !== "payment") {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentId) {
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm the real payment status by querying the Mercado Pago API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const mpPayment = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Failed to fetch MP payment:", mpRes.status, JSON.stringify(mpPayment));
      // Respond 200 to avoid endless retries on unknown ids
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = mpPayment.external_reference as string | undefined;
    const status = mpPayment.status as string | undefined; // approved, pending, rejected, etc.

    if (!orderId) {
      console.error("MP payment without external_reference:", paymentId);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the pending payment for this order
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    const paymentToUpdate = payments?.[0];
    if (!paymentToUpdate) {
      console.error("Payment not found for order:", orderId);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map MP status to our internal status
    let newStatus = paymentToUpdate.status;
    if (status === "approved") newStatus = "paid";
    else if (status === "pending" || status === "in_process" || status === "authorized") newStatus = "pending";
    else if (status === "rejected" || status === "cancelled") newStatus = "failed";
    else if (status === "refunded" || status === "charged_back") newStatus = "refunded";

    const previousStatus = paymentToUpdate.status;

    if (newStatus === previousStatus) {
      return new Response(JSON.stringify({ received: true, matched: true, unchanged: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentUpdate: Record<string, unknown> = {
      status: newStatus,
      transaction_nsu: String(paymentId),
    };
    if (newStatus === "paid") {
      paymentUpdate.paid_at = new Date().toISOString();
      if (mpPayment.transaction_details?.external_resource_url) {
        paymentUpdate.receipt_url = mpPayment.transaction_details.external_resource_url;
      }
    }

    const { error: updatePaymentErr } = await supabase
      .from("payments")
      .update(paymentUpdate)
      .eq("id", paymentToUpdate.id);
    if (updatePaymentErr) {
      console.error("Error updating payment:", updatePaymentErr);
      throw updatePaymentErr;
    }

    // Update the order status when paid
    if (newStatus === "paid") {
      const orderUpdate: Record<string, unknown> = { status: "paid" };
      const payer = mpPayment.payer ?? {};
      if (payer.email) orderUpdate.customer_email = payer.email;
      const fullName = [payer.first_name, payer.last_name].filter(Boolean).join(" ").trim();
      if (fullName) orderUpdate.customer_name = fullName;

      const { error: updateOrderErr } = await supabase
        .from("orders")
        .update(orderUpdate)
        .eq("id", orderId);
      if (updateOrderErr) {
        console.error("Error updating order:", updateOrderErr);
      }
    }

    console.log(`MP payment ${paymentToUpdate.id} / order ${orderId}: ${previousStatus} -> ${newStatus}`);

    // Notify Telegram about the payment status change (reuse existing flow)
    try {
      await supabase.functions.invoke("notify-telegram-order", {
        body: {
          kind: "payment_status",
          orderId,
          previousStatus,
          newStatus,
          amount: Number(paymentToUpdate.amount),
          paymentType: paymentToUpdate.payment_type,
          customerName: undefined,
          receiptUrl: paymentUpdate.receipt_url ?? paymentToUpdate.receipt_url ?? undefined,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to notify Telegram about MP payment status:", notifyErr);
    }

    return new Response(JSON.stringify({ received: true, matched: true, order_id: orderId, status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error processing Mercado Pago webhook:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
