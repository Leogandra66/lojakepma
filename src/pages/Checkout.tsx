import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 as LoaderIcon } from "lucide-react";
import { z } from "zod";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Tag, X } from "lucide-react";

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  eligible_product_ids: string[] | null; // null = all products
}

interface CheckoutForm {
  name: string;
  doc: string; // CPF or CNPJ
  email: string;
  phone: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const emptyForm: CheckoutForm = {
  name: "",
  doc: "",
  email: "",
  phone: "",
  zip: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const checkoutSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome ou razão social"),
  doc: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 11 || v.length === 14, "CPF (11) ou CNPJ (14) inválido"),
  email: z.string().trim().email("E-mail inválido"),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Telefone inválido"),
  zip: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 8, "CEP inválido"),
  street: z.string().trim().min(2, "Informe a rua"),
  number: z.string().trim().min(1, "Informe o número"),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().min(2, "Informe o bairro"),
  city: z.string().trim().min(2, "Informe a cidade"),
  state: z.string().trim().length(2, "UF inválida"),
});

export default function Checkout() {
  const { items, totalPrice, preorderTotal, regularTotal, hasPreorderItems, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<false | "default" | "pix" | "split">(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);

  // Split payment state
  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");
  const [splitCombo, setSplitCombo] = useState<"card_pix" | "card_card">("card_pix");
  const [splitPart1Input, setSplitPart1Input] = useState<string>(""); // BRL string typed by user

  const setField = (k: keyof CheckoutForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const formValid = checkoutSchema.safeParse(form).success;

  const depositAmount = preorderTotal * 0.4;
  const subtotal = regularTotal + depositAmount;

  // Calculate discount — base is what the customer pays NOW
  // (preorder items count only the 40% deposit, not the full price)
  const itemPayableNow = (i: typeof items[number]) => {
    const isPreorder = i.product.status === "preorder";
    const unit = isPreorder ? i.product.price * 0.4 : i.product.price;
    return unit * i.quantity;
  };

  let discountAmount = 0;
  if (appliedCoupon) {
    let discountBase = items.reduce((sum, i) => sum + itemPayableNow(i), 0);
    if (appliedCoupon.eligible_product_ids) {
      discountBase = items
        .filter((i) => appliedCoupon.eligible_product_ids!.includes(i.product.id))
        .reduce((sum, i) => sum + itemPayableNow(i), 0);
    }

    if (appliedCoupon.discount_type === "percentage") {
      discountAmount = discountBase * (appliedCoupon.discount_value / 100);
    } else {
      discountAmount = Math.min(appliedCoupon.discount_value, discountBase);
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const amountDueNow = subtotal - discountAmount;

  // Redirect only AFTER the auth session finished restoring, to avoid
  // sending an already-logged-in user to the login page (race condition).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/entrar?redirect=/checkout");
    } else if (items.length === 0) {
      navigate("/carrinho");
    }
  }, [authLoading, user, items.length, navigate]);

  // Prefill the form from the user's profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setForm((f) => ({
        ...f,
        name: data?.full_name || f.name,
        doc: data?.cpf || f.doc,
        email: user.email || f.email,
        phone: data?.phone || f.phone,
        zip: data?.address_zip || f.zip,
        street: data?.address_street || f.street,
        number: data?.address_number || f.number,
        complement: data?.address_complement || f.complement,
        neighborhood: data?.address_neighborhood || f.neighborhood,
        city: data?.address_city || f.city,
        state: data?.address_state || f.state,
      }));
    })();
  }, [user]);

  async function lookupCep(rawCep: string) {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
    } catch {
      toast.error("Erro ao consultar o CEP");
    } finally {
      setCepLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || items.length === 0) {
    return null;
  }


  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (error || !data) {
        toast.error("Cupom inválido ou não encontrado");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("Este cupom expirou");
        return;
      }

      if (data.max_uses && data.used_count >= data.max_uses) {
        toast.error("Este cupom atingiu o limite de usos");
        return;
      }

      if (data.min_order_value && totalPrice < Number(data.min_order_value)) {
        toast.error(`Pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace(".", ",")} para este cupom`);
        return;
      }

      // Check product-specific eligibility
      const { data: cpData } = await supabase
        .from("coupon_products")
        .select("product_id")
        .eq("coupon_id", data.id);

      const linkedProductIds = (cpData ?? []).map((cp: any) => cp.product_id);
      let eligibleIds: string[] | null = null;

      if (linkedProductIds.length > 0) {
        // Check if any cart item is eligible
        const cartProductIds = items.map((i) => i.product.id);
        const eligible = linkedProductIds.filter((id: string) => cartProductIds.includes(id));
        if (eligible.length === 0) {
          toast.error("Este cupom não se aplica a nenhum produto do seu carrinho");
          return;
        }
        eligibleIds = linkedProductIds;
      }

      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type as "percentage" | "fixed",
        discount_value: Number(data.discount_value),
        eligible_product_ids: eligibleIds,
      });
      setCouponCode("");
      toast.success("Cupom aplicado!");
    } catch {
      toast.error("Erro ao validar cupom");
    } finally {
      setCouponLoading(false);
    }
  }

  // Split calculation helpers
  const parseBRLInput = (s: string) => {
    const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };
  const split = (() => {
    // amountDueNow is base; part 1 = card (always), part 2 = card or pix
    const p1 = parseBRLInput(splitPart1Input);
    const p2 = Math.max(0, amountDueNow - p1);
    const p1Method = "card" as "card" | "pix";
    const p2Method = (splitCombo === "card_pix" ? "pix" : "card") as "card" | "pix";
    const p1Final = p1Method === "pix" ? p1 * 0.9 : p1;
    const p2Final = p2Method === "pix" ? p2 * 0.9 : p2;
    const valid = p1 >= 5 && p2 >= 5 && p1 < amountDueNow;
    return { p1, p2, p1Method, p2Method, p1Final, p2Final, valid, effectiveTotal: p1Final + p2Final };
  })();

  const handleCheckout = async (mode: "default" | "pix" | "split" = "default") => {
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Preencha os dados corretamente");
      return;
    }
    if (mode === "split" && !split.valid) {
      toast.error("Divisão inválida. Cada parte precisa ter no mínimo R$ 5,00.");
      return;
    }
    const f = parsed.data;
    setLoading(mode);
    try {
      const pix = mode === "pix";
      const isSplit = mode === "split";

      // PIX (single) gives an extra 10% discount on the amount due now (stacks with coupon)
      const pixDiscount = pix ? amountDueNow * 0.1 : 0;
      // Split PIX portion discount (only on the pix part)
      const splitPixDiscount = isSplit && split.p2Method === "pix" ? split.p2 * 0.1 : 0;
      const totalDiscount = discountAmount + pixDiscount + splitPixDiscount;
      const finalAmountDue = amountDueNow - pixDiscount - splitPixDiscount;

      const orderPayload = {
        user_id: user.id,
        total: totalPrice - totalDiscount,
        has_preorder_items: hasPreorderItems,
        status: "pending_payment",
        coupon_id: appliedCoupon?.id || null,
        discount_amount: totalDiscount,
        customer_name: f.name,
        customer_cpf: f.doc,
        customer_email: f.email,
        customer_phone: f.phone,
        shipping_zip: f.zip,
        shipping_street: f.street,
        shipping_number: f.number,
        shipping_complement: f.complement || null,
        shipping_neighborhood: f.neighborhood,
        shipping_city: f.city,
        shipping_state: f.state,
      };

      // Signature of the current cart, used to detect a duplicate of a recent order.
      const cartSignature = items
        .map((i) => `${i.product.id}:${i.quantity}`)
        .sort()
        .join("|");

      // Try to reuse a recent unpaid order (last 24h) with the exact same cart,
      // instead of creating a brand new order on every checkout click.
      let order: any = null;
      let isNewOrder = true;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, order_items(product_id, quantity)")
        .eq("user_id", user.id)
        .eq("status", "pending_payment")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);

      const reusable = (recentOrders ?? []).find((o: any) => {
        const sig = (o.order_items ?? [])
          .map((it: any) => `${it.product_id}:${it.quantity}`)
          .sort()
          .join("|");
        return sig === cartSignature;
      });

      if (reusable) {
        // Reuse the existing order: refresh its data and clear stale items/payments.
        const { data: updated, error: updateErr } = await supabase
          .from("orders")
          .update(orderPayload as any)
          .eq("id", reusable.id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        order = updated;
        isNewOrder = false;

        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("payments").delete().eq("order_id", order.id).eq("status", "pending");
      } else {
        const { data: inserted, error: orderErr } = await supabase
          .from("orders")
          .insert(orderPayload as any)
          .select()
          .single();
        if (orderErr) throw orderErr;
        order = inserted;
      }


      // Save data back to the user's profile for next time (fire-and-forget)
      supabase
        .from("profiles")
        .update({
          full_name: f.name,
          cpf: f.doc,
          phone: f.phone,
          address_zip: f.zip,
          address_street: f.street,
          address_number: f.number,
          address_complement: f.complement || null,
          address_neighborhood: f.neighborhood,
          address_city: f.city,
          address_state: f.state,
        } as any)
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error) console.error("Failed to update profile:", error);
        });

      if (appliedCoupon && isNewOrder) {
        await supabase.rpc("increment_coupon_usage" as any, { coupon_id: appliedCoupon.id });
      }


      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        is_preorder: item.product.status === "preorder",
        preorder_estimated_delivery: item.product.preorder_estimated_delivery,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // Only notify on a freshly created order (skip when reusing a duplicate).
      if (isNewOrder) {
      // Notify owner about new order (fire-and-forget; never block checkout)

      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "new-order",
            idempotencyKey: `new-order-${order.id}`,
            templateData: {
              orderId: order.id,
              customerName: user.user_metadata?.full_name || user.email,
              customerEmail: user.email,
              total: totalPrice - discountAmount,
              amountDueNow,
              hasPreorderItems,
              createdAt: new Date().toLocaleString("pt-BR"),
              items: orderItems.map((it) => ({
                name: it.product_name,
                quantity: it.quantity,
                unit_price: it.unit_price,
                is_preorder: it.is_preorder,
              })),
            },
          },
        })
        .catch((e) => console.error("Failed to send new-order email:", e));

      // Notify Telegram about new order — await so the request isn't aborted by the redirect to the payment gateway
      try {
        const { error: tgErr } = await supabase.functions.invoke("notify-telegram-order", {
          body: {
            orderId: order.id,
            customerName: user.user_metadata?.full_name || user.email,
            customerEmail: user.email,
            total: totalPrice - discountAmount,
            amountDueNow,
            hasPreorderItems,
            items: orderItems.map((it) => ({
              name: it.product_name,
              quantity: it.quantity,
              unit_price: it.unit_price,
              is_preorder: it.is_preorder,
            })),
          },
        });
        if (tgErr) console.error("Telegram notification error:", tgErr);
      } catch (e) {
        console.error("Failed to send Telegram notification:", e);
      }
      } // end isNewOrder notifications



      const paymentType = hasPreorderItems && regularTotal === 0 ? "preorder_deposit" : "full";
      const { error: paymentErr } = await supabase.from("payments").insert({
        order_id: order.id,
        payment_type: paymentType,
        amount: finalAmountDue,
        status: "pending",
      });
      if (paymentErr) throw paymentErr;

      const infinityItems = items.map((item) => {
        const isPreorder = item.product.status === "preorder";
        const unitPrice = isPreorder ? item.product.price * 0.4 : item.product.price;
        const priceCents = Math.round(unitPrice * 100);
        return {
          quantity: item.quantity,
          price: priceCents,
          description: item.product.name,
        };
      });

      // Validate: InfinitePay requires every item price > 0
      const invalid = infinityItems.find((i) => !i.price || i.price <= 0);
      if (invalid) {
        console.error("Item inválido para pagamento:", invalid);
        throw new Error(`Produto "${invalid.description}" está com preço inválido. Remova-o do carrinho ou contate o suporte.`);
      }

      // Apply discount by reducing item prices proportionally (gateways reject negative prices)
      if (totalDiscount > 0) {
        const totalCents = infinityItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const discountCents = Math.round(totalDiscount * 100);
        let remaining = discountCents;
        infinityItems.forEach((it, idx) => {
          const isLast = idx === infinityItems.length - 1;
          const share = isLast
            ? remaining
            : Math.floor((it.price * it.quantity * discountCents) / totalCents);
          const perUnit = Math.floor(share / it.quantity);
          it.price = Math.max(1, it.price - perUnit);
          remaining -= perUnit * it.quantity;
        });
      }

      const origin = window.location.origin;
      const redirectUrl = `${origin}/pagamento-concluido`;

      // Gateway selection by environment:
      //  - Preview/staging (*.lovable.app) -> Mercado Pago (em teste)
      //  - Production (loja.kepmabrasil.com.br) -> InfinitePay (atual)
      // Override here to force a gateway: "infinitepay" | "mercadopago" | "auto"
      const gateway: "infinitepay" | "mercadopago" = "mercadopago";

      const paymentFunction = gateway === "mercadopago" ? "create-payment-mp" : "create-payment";

      // Split path: request two payment preferences
      if (isSplit) {
        // Update order to split mode (works for both reused & new order)
        await supabase.from("orders")
          .update({ payment_mode: "split", split_config: { combo: splitCombo } } as any)
          .eq("id", order.id);

        const { data: splitData, error: splitErr } = await supabase.functions.invoke("create-payment-mp", {
          body: {
            orderId: order.id,
            redirectUrl,
            parts: [
              { partIndex: 1, method: split.p1Method, amountCents: Math.round(split.p1Final * 100) },
              { partIndex: 2, method: split.p2Method, amountCents: Math.round(split.p2Final * 100) },
            ],
          },
        });
        if (splitErr) throw splitErr;
        const parts = (splitData?.parts ?? []) as Array<{ partIndex: number; initPoint: string }>;
        const first = parts.find((p) => p.partIndex === 1);
        if (!first?.initPoint) throw new Error("Falha ao criar pagamento dividido");
        clearCart();
        window.location.href = first.initPoint;
        return;
      }

      const { data: paymentData, error: payErr } = await supabase.functions.invoke(paymentFunction, {
        body: { orderId: order.id, items: infinityItems, redirectUrl, pixOnly: pix },
      });

      if (payErr) throw payErr;

      if (paymentData?.payment_url) {
        clearCart();
        window.location.href = paymentData.payment_url;
      } else {
        toast.info("Pedido criado! O pagamento será configurado em breve.");
        clearCart();
        navigate(`/minha-conta`);
      }
    } catch (err: any) {
      console.error("[Checkout] finalize error:", err);
      const detail = err?.message || err?.error || err?.msg || "tente novamente";
      toast.error("Erro ao finalizar compra: " + detail);
    } finally {
      setLoading(false);
    }
  };

  const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-8">
        <h1 className="font-heading text-3xl font-bold mb-8">Finalizar Compra</h1>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold">Itens do Pedido</h2>
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between text-sm">
                <span>{product.name} × {quantity} {product.status === "preorder" && <span className="text-preorder">(encomenda)</span>}</span>
                <span className="font-semibold">{formatBRL(product.price * quantity)}</span>
              </div>
            ))}
          </div>

          {/* Customer / shipping data */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold">Dados para faturamento e entrega</h2>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nome / Razão social</Label>
              <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Seu nome ou razão social" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="doc">CPF / CNPJ</Label>
                <Input id="doc" value={form.doc} onChange={(e) => setField("doc", e.target.value)} placeholder="Somente números" inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@exemplo.com" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="zip">CEP</Label>
                <div className="relative">
                  <Input
                    id="zip"
                    value={form.zip}
                    onChange={(e) => setField("zip", e.target.value)}
                    onBlur={(e) => lookupCep(e.target.value)}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={form.number} onChange={(e) => setField("number", e.target.value)} placeholder="123" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="street">Rua / Logradouro</Label>
              <Input id="street" value={form.street} onChange={(e) => setField("street", e.target.value)} placeholder="Rua, avenida..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complement">Complemento (opcional)</Label>
              <Input id="complement" value={form.complement} onChange={(e) => setField("complement", e.target.value)} placeholder="Apto, bloco..." />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" value={form.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} placeholder="Bairro" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">UF</Label>
                <Input id="state" value={form.state} maxLength={2} onChange={(e) => setField("state", e.target.value.toUpperCase())} placeholder="SP" />
              </div>
            </div>
          </div>


          {hasPreorderItems && (
            <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm space-y-1">
              <p><strong>Itens em estoque:</strong> {formatBRL(regularTotal)}</p>
              <p><strong>Encomendas (40% agora):</strong> {formatBRL(depositAmount)}</p>
              <p className="text-muted-foreground">Os 60% restantes das encomendas serão cobrados na entrega.</p>
            </div>
          )}

          {/* Coupon section */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Cupom de Desconto</h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
                <span className="text-sm font-mono font-bold">{appliedCoupon.code}</span>
                <span className="text-sm text-green-600 font-semibold">
                  -{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : formatBRL(appliedCoupon.discount_value)}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAppliedCoupon(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o código do cupom"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                  maxLength={30}
                />
                <Button variant="outline" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto ({appliedCoupon!.code})</span>
                <span>-{formatBRL(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-heading text-xl font-bold">Total a pagar agora:</span>
              <span className="font-heading text-2xl font-bold">{formatBRL(amountDueNow)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-green-600">
              <span className="font-semibold">No PIX (-10%):</span>
              <span className="font-bold">{formatBRL(amountDueNow * 0.9)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {!formValid && (
              <p className="text-sm text-muted-foreground text-center">
                Preencha seus dados acima para liberar o pagamento.
              </p>
            )}

            {/* Payment mode selector */}
            <div className="flex gap-2 p-1 bg-muted rounded-full">
              <button
                type="button"
                onClick={() => setPaymentMode("single")}
                className={`flex-1 rounded-full text-sm py-2 transition ${paymentMode === "single" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}
              >
                Pagamento único
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("split")}
                className={`flex-1 rounded-full text-sm py-2 transition ${paymentMode === "split" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}
              >
                Dividir em 2 formas
              </button>
            </div>

            {paymentMode === "single" ? (
              <>
                <Button
                  size="lg"
                  className="w-full rounded-full text-base bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleCheckout("pix")}
                  disabled={loading !== false || !formValid}
                >
                  {loading === "pix" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Pagar com PIX — 10% de desconto"}
                </Button>
                <Button
                  size="lg"
                  className="btn-gold w-full rounded-full text-base"
                  onClick={() => handleCheckout("default")}
                  disabled={loading !== false || !formValid}
                >
                  {loading === "default" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Pagar com Mercado Pago"}
                </Button>
              </>
            ) : (
              <div className="space-y-3 border rounded-2xl p-4">
                <div>
                  <label className="text-sm font-medium">Combinação</label>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setSplitCombo("card_pix")}
                      className={`flex-1 rounded-full text-sm py-2 border ${splitCombo === "card_pix" ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                    >
                      Cartão + PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitCombo("card_card")}
                      className={`flex-1 rounded-full text-sm py-2 border ${splitCombo === "card_card" ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                    >
                      Cartão + Cartão
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Valor da 1ª parte (Cartão) em R$</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={splitPart1Input}
                    onChange={(e) => setSplitPart1Input(e.target.value)}
                    placeholder="Ex: 1500,00"
                    className="mt-2 w-full rounded-full border px-4 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total a dividir: {formatBRL(amountDueNow)}
                  </p>
                </div>

                <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>1ª parte — Cartão</span>
                    <span className="font-medium">{formatBRL(split.p1Final)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2ª parte — {split.p2Method === "pix" ? "PIX (−10%)" : "Cartão"}</span>
                    <span className="font-medium">{formatBRL(split.p2Final)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-semibold">Total efetivo</span>
                    <span className="font-semibold">{formatBRL(split.effectiveTotal)}</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="btn-gold w-full rounded-full text-base"
                  onClick={() => handleCheckout("split")}
                  disabled={loading !== false || !formValid || !split.valid}
                >
                  {loading === "split" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Iniciar pagamento dividido"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Você pagará a 1ª parte agora. Após concluir, retornará automaticamente para pagar a 2ª parte.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
