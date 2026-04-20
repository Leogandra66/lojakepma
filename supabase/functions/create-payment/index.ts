const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, items, redirectUrl } = await req.json();

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "orderId and items are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Build InfinitePay payload
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;
    const payload = {
      handle: "lmgbrasil",
      items: items.map((item: { quantity: number; price: number; description: string }) => ({
        quantity: item.quantity,
        price: item.price, // already in cents
        description: item.description,
      })),
      order_nsu: orderId,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
    };

    // Call InfinitePay checkout links API
    const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const paymentData = await response.json();

    if (!response.ok) {
      console.error("InfinitePay error:", JSON.stringify(paymentData));
      throw new Error(`InfinitePay error [${response.status}]: ${JSON.stringify(paymentData)}`);
    }

    // The API should return a checkout URL
    const paymentUrl = paymentData.url || paymentData.payment_url || paymentData.checkout_url || "";

    // Update payment record with InfinitePay info
    await supabase
      .from("payments")
      .update({
        infinitypay_id: paymentData.id || paymentData.slug || null,
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
