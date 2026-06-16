const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CheckoutItem {
  quantity: number;
  price: number; // in cents (same format used by the InfinitePay flow)
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, items, redirectUrl, pixOnly } = await req.json();

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "orderId and items are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
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

    const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    // Build Mercado Pago preference payload
    const preference = {
      items: (items as CheckoutItem[]).map((item) => ({
        title: item.description,
        quantity: item.quantity,
        currency_id: "BRL",
        // Mercado Pago expects unit_price as a decimal value (not cents)
        unit_price: Math.round(item.price) / 100,
      })),
      external_reference: orderId,
      notification_url: notificationUrl,
      back_urls: {
        success: redirectUrl,
        failure: redirectUrl,
        pending: redirectUrl,
      },
      auto_return: "approved",
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Mercado Pago error:", JSON.stringify(data));
      throw new Error(`Mercado Pago error [${response.status}]: ${JSON.stringify(data)}`);
    }

    const paymentUrl = data.init_point || data.sandbox_init_point || "";

    // Mark payment with gateway + preference id
    await supabase
      .from("payments")
      .update({
        gateway: "mercadopago",
        mp_preference_id: data.id ?? null,
      })
      .eq("order_id", orderId)
      .eq("status", "pending");

    return new Response(JSON.stringify({ payment_url: paymentUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error creating Mercado Pago payment:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
