const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InfinitePayCustomer {
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  document?: string;
  tax_id?: string;
}

interface InfinitePayAddress {
  zip_code?: string;
  zipcode?: string;
  postal_code?: string;
  cep?: string;
  street?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  district?: string;
  city?: string;
  state?: string;
  uf?: string;
}

interface InfinitePayWebhookPayload {
  invoice_slug?: string;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
  transaction_nsu?: string;
  order_nsu?: string;
  receipt_url?: string;
  items?: unknown[];
  customer?: InfinitePayCustomer;
  buyer?: InfinitePayCustomer;
  payer?: InfinitePayCustomer;
  address?: InfinitePayAddress;
  shipping_address?: InfinitePayAddress;
  billing_address?: InfinitePayAddress;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: InfinitePayWebhookPayload = await req.json();
    console.log("InfinitePay webhook received:", JSON.stringify(payload));

    const { transaction_nsu, order_nsu, invoice_slug, capture_method, receipt_url } = payload;

    if (!transaction_nsu && !order_nsu) {
      console.error("Webhook missing both transaction_nsu and order_nsu");
      return new Response(JSON.stringify({ error: "Missing transaction_nsu or order_nsu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to find payment by transaction_nsu first; fallback to order_id
    let paymentQuery = supabase.from("payments").select("*");
    if (transaction_nsu) {
      paymentQuery = paymentQuery.eq("transaction_nsu", transaction_nsu);
    } else if (order_nsu) {
      paymentQuery = paymentQuery.eq("order_id", order_nsu).eq("status", "pending");
    }

    const { data: existingPayments, error: findErr } = await paymentQuery;

    if (findErr) {
      console.error("Error finding payment:", findErr);
    }

    let paymentToUpdate = existingPayments?.[0];

    // If not found by transaction_nsu, try fallback by order_nsu
    if (!paymentToUpdate && transaction_nsu && order_nsu) {
      const { data: byOrder } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", order_nsu)
        .eq("status", "pending")
        .limit(1);
      paymentToUpdate = byOrder?.[0];
    }

    if (!paymentToUpdate) {
      console.error("Payment not found for transaction_nsu:", transaction_nsu, "order_nsu:", order_nsu);
      // Respond 200 to avoid retries on unknown payments
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = paymentToUpdate.order_id;

    // Update payment record
    const { error: updatePaymentErr } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        transaction_nsu: transaction_nsu ?? paymentToUpdate.transaction_nsu,
        slug: invoice_slug ?? paymentToUpdate.slug,
        capture_method: capture_method ?? paymentToUpdate.capture_method,
        receipt_url: receipt_url ?? paymentToUpdate.receipt_url,
      })
      .eq("id", paymentToUpdate.id);

    if (updatePaymentErr) {
      console.error("Error updating payment:", updatePaymentErr);
      throw updatePaymentErr;
    }

    // Update order status to paid
    const { error: updateOrderErr } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId);

    if (updateOrderErr) {
      console.error("Error updating order:", updateOrderErr);
      throw updateOrderErr;
    }

    console.log(`Payment ${paymentToUpdate.id} and order ${orderId} marked as paid.`);

    return new Response(JSON.stringify({ received: true, matched: true, order_id: orderId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
