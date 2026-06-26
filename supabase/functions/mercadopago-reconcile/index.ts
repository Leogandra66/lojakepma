const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type MpPayment = {
  id: number | string;
  status?: string;
  external_reference?: string;
  transaction_details?: { external_resource_url?: string };
  payer?: { email?: string; first_name?: string; last_name?: string };
};

function mapStatus(mpStatus: string | undefined, current: string): string {
  if (mpStatus === "approved") return "paid";
  if (mpStatus === "pending" || mpStatus === "in_process" || mpStatus === "authorized") return "pending";
  if (mpStatus === "rejected" || mpStatus === "cancelled") return "failed";
  if (mpStatus === "refunded" || mpStatus === "charged_back") return "refunded";
  return current;
}

// Apply a Mercado Pago payment to our order/payment records.
// Returns a short outcome string. Shared logic used by manual + automatic reconcile.
async function applyMpPaymentToOrder(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  mpPayment: MpPayment,
): Promise<{ changed: boolean; status: string }> {
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const paymentToUpdate = payments?.[0];
  if (!paymentToUpdate) return { changed: false, status: "no_payment_record" };

  const previousStatus = paymentToUpdate.status as string;
  const newStatus = mapStatus(mpPayment.status, previousStatus);

  if (newStatus === previousStatus) return { changed: false, status: newStatus };

  const paymentUpdate: Record<string, unknown> = {
    status: newStatus,
    transaction_nsu: String(mpPayment.id),
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
  if (updatePaymentErr) throw updatePaymentErr;

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
    if (updateOrderErr) console.error("Error updating order:", updateOrderErr);

    // Notify Telegram (reuse existing flow)
    try {
      await supabase.functions.invoke("notify-telegram-order", {
        body: {
          kind: "payment_status",
          orderId,
          previousStatus,
          newStatus,
          amount: Number(paymentToUpdate.amount),
          paymentType: paymentToUpdate.payment_type,
          receiptUrl: paymentUpdate.receipt_url ?? paymentToUpdate.receipt_url ?? undefined,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to notify Telegram on reconcile:", notifyErr);
    }
  }

  console.log(`Reconcile: payment ${paymentToUpdate.id} / order ${orderId}: ${previousStatus} -> ${newStatus}`);
  return { changed: true, status: newStatus };
}

async function searchBestMpPayment(accessToken: string, orderId: string): Promise<MpPayment | null> {
  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  if (!res.ok) {
    console.error("MP search failed:", res.status, JSON.stringify(data));
    return null;
  }
  const results: MpPayment[] = data?.results ?? [];
  if (results.length === 0) return null;
  // Prefer an approved payment; otherwise the most recent one.
  const approved = results.find((p) => p.status === "approved");
  return approved ?? results[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body?.orderId;
    const auto: boolean = body?.auto === true;

    // ---- Automatic mode: reconcile recent pending orders (called by cron) ----
    if (auto) {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: pendingOrders } = await admin
        .from("orders")
        .select("id")
        .eq("status", "pending_payment")
        .gte("created_at", since)
        .limit(100);

      let updated = 0;
      for (const o of pendingOrders ?? []) {
        const mp = await searchBestMpPayment(accessToken, o.id as string);
        if (!mp) continue;
        const result = await applyMpPaymentToOrder(admin, o.id as string, mp);
        if (result.changed) updated++;
      }

      return new Response(JSON.stringify({ ok: true, scanned: pendingOrders?.length ?? 0, updated }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Manual mode: requires an authenticated admin user ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If the admin pasted a specific Mercado Pago payment ID, fetch it directly.
    // Useful when the payment's external_reference doesn't match the order code.
    const mpPaymentId: string | undefined = body?.mpPaymentId
      ? String(body.mpPaymentId).trim()
      : undefined;

    let mp: MpPayment | null;
    if (mpPaymentId) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      mp = res.ok ? (data as MpPayment) : null;
      if (!mp) {
        return new Response(
          JSON.stringify({ ok: true, found: false, message: `Pagamento ${mpPaymentId} não encontrado no Mercado Pago.` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      mp = await searchBestMpPayment(accessToken, orderId);
    }

    if (!mp) {
      return new Response(
        JSON.stringify({ ok: true, found: false, message: "Nenhum pagamento encontrado no Mercado Pago para este pedido." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await applyMpPaymentToOrder(admin, orderId, mp);
    return new Response(
      JSON.stringify({
        ok: true,
        found: true,
        mp_status: mp.status,
        order_status: result.status,
        changed: result.changed,
        message: result.changed
          ? `Pagamento ${mp.status} encontrado. Pedido atualizado para "${result.status}".`
          : `Pagamento ${mp.status} encontrado. Nenhuma mudança necessária (já estava "${result.status}").`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error in mercadopago-reconcile:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
