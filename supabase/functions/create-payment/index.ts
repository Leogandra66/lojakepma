import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, amount } = await req.json();

    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: "orderId and amount are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const INFINITYPAY_API_KEY = Deno.env.get("INFINITYPAY_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the order exists
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the origin for the return URL
    const origin = req.headers.get("origin") || "https://id-preview--8950058c-5f95-4283-ad3a-220724166484.lovable.app";
    const returnUrl = `${origin}/pagamento/retorno?order_id=${orderId}&status=approved`;

    let paymentUrl = "";
    let infinitypayId = "";

    if (INFINITYPAY_API_KEY) {
      // Real InfinityPay API call
      const response = await fetch("https://api.infinitypay.io/v2/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${INFINITYPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // cents
          currency: "BRL",
          description: `Pedido #${orderId.slice(0, 8)}`,
          return_url: returnUrl,
        }),
      });

      const paymentData = await response.json();
      if (!response.ok) {
        throw new Error(`InfinityPay error [${response.status}]: ${JSON.stringify(paymentData)}`);
      }

      paymentUrl = paymentData.payment_url || paymentData.url || "";
      infinitypayId = paymentData.id || "";
    } else {
      // Dev mode: simulate payment URL
      paymentUrl = returnUrl;
      infinitypayId = `dev_${Date.now()}`;
    }

    // Update payment record
    await supabase
      .from("payments")
      .update({
        infinitypay_id: infinitypayId,
        infinitypay_link: paymentUrl,
      })
      .eq("order_id", orderId)
      .eq("status", "pending");

    return new Response(JSON.stringify({ payment_url: paymentUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error creating payment:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
