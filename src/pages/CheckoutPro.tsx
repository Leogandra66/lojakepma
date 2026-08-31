import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CreditCard, QrCode, ArrowRight, ArrowLeft, Check, AlertCircle, Split } from "lucide-react";
import { z } from "zod";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  eligible_product_ids: string[] | null;
}

interface CustomerForm {
  name: string;
  doc: string;
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

const emptyForm: CustomerForm = {
  name: "", doc: "", email: "", phone: "", zip: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const customerSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome ou razão social"),
  doc: z.string().transform(onlyDigits).refine((v) => v.length === 11 || v.length === 14, "CPF/CNPJ inválido"),
  email: z.string().trim().email("E-mail inválido"),
  phone: z.string().transform(onlyDigits).refine((v) => v.length >= 10 && v.length <= 11, "Telefone inválido"),
  zip: z.string().transform(onlyDigits).refine((v) => v.length === 8, "CEP inválido"),
  street: z.string().trim().min(2, "Informe a rua"),
  number: z.string().trim().min(1, "Informe o número"),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().min(2, "Informe o bairro"),
  city: z.string().trim().min(2, "Informe a cidade"),
  state: z.string().trim().length(2, "UF inválida"),
});

type Step = "cart" | "customer" | "payment" | "review";
type PaymentMethod = "card" | "pix" | "split_card_pix" | "split_card_card";

export default function CheckoutPro() {
  const { items, totalPrice, preorderTotal, regularTotal, hasPreorderItems, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("cart");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [splitAmount, setSplitAmount] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/entrar?redirect=/checkout-pro");
    else if (items.length === 0) navigate("/carrinho");
  }, [authLoading, user, items.length, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
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

  const depositAmount = preorderTotal * 0.4;
  const subtotal = regularTotal + depositAmount;

  const itemPayableNow = (i: typeof items[number]) => {
    const isPreorder = i.product.status === "preorder";
    const unit = isPreorder ? i.product.price * 0.4 : i.product.price;
    return unit * i.quantity;
  };

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    let base = items.reduce((sum, i) => sum + itemPayableNow(i), 0);
    if (appliedCoupon.eligible_product_ids) {
      base = items.filter((i) => appliedCoupon.eligible_product_ids!.includes(i.product.id))
        .reduce((sum, i) => sum + itemPayableNow(i), 0);
    }
    const d = appliedCoupon.discount_type === "percentage"
      ? base * (appliedCoupon.discount_value / 100)
      : Math.min(appliedCoupon.discount_value, base);
    return Math.min(d, subtotal);
  }, [appliedCoupon, items, regularTotal, preorderTotal]);

  const amountDueNow = subtotal - discountAmount;
  const pixDiscount = paymentMethod === "pix" ? amountDueNow * 0.1 : 0;
  const split = useMemo(() => {
    if (!paymentMethod.startsWith("split_")) return null;
    const p1 = parseBRLInput(splitAmount);
    const p2 = Math.max(0, amountDueNow - p1);
    const p2Method = paymentMethod === "split_card_pix" ? "pix" : "card";
    const p1Final = p1;
    const p2Final = p2Method === "pix" ? p2 * 0.9 : p2;
    const valid = p1 >= 5 && p2 >= 5 && p1 < amountDueNow;
    return { p1, p2, p1Method: "card" as const, p2Method, p1Final, p2Final, valid, effectiveTotal: p1Final + p2Final };
  }, [paymentMethod, splitAmount, amountDueNow]);

  const finalAmountDue = paymentMethod === "pix"
    ? amountDueNow - pixDiscount
    : split
    ? split.effectiveTotal
    : amountDueNow;

  const totalDiscount = discountAmount + pixDiscount + (split && split.p2Method === "pix" ? split.p2 * 0.1 : 0);

  function parseBRLInput(s: string) {
    const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  async function lookupCep(rawCep: string) {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado"); return; }
      setForm((f) => ({ ...f, street: data.logradouro || f.street, neighborhood: data.bairro || f.neighborhood, city: data.localidade || f.city, state: data.uf || f.state }));
    } catch { toast.error("Erro ao consultar o CEP"); }
    finally { setCepLoading(false); }
  }

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase.from("coupons").select("*").eq("code", code).eq("active", true).single();
      if (error || !data) { toast.error("Cupom inválido"); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("Cupom expirado"); return; }
      if (data.max_uses && data.used_count >= data.max_uses) { toast.error("Limite de usos atingido"); return; }
      if (data.min_order_value && totalPrice < Number(data.min_order_value)) { toast.error(`Pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace(".", ",")}`); return; }

      const { data: cpData } = await supabase.from("coupon_products").select("product_id").eq("coupon_id", data.id);
      const linked = (cpData ?? []).map((cp: any) => cp.product_id);
      let eligibleIds: string[] | null = null;
      if (linked.length > 0) {
        const cartIds = items.map((i) => i.product.id);
        if (!linked.some((id: string) => cartIds.includes(id))) { toast.error("Cupom não se aplica aos produtos do carrinho"); return; }
        eligibleIds = linked;
      }
      setAppliedCoupon({ id: data.id, code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value), eligible_product_ids: eligibleIds });
      setCouponCode("");
      toast.success("Cupom aplicado!");
    } catch { toast.error("Erro ao validar cupom"); }
    finally { setCouponLoading(false); }
  }

  function goNext() {
    setError(null);
    if (step === "cart") setStep("customer");
    else if (step === "customer") {
      const parsed = customerSchema.safeParse(form);
      if (!parsed.success) { setError(parsed.error.errors[0]?.message || "Preencha os dados corretamente"); return; }
      setStep("payment");
    }
    else if (step === "payment") {
      if (paymentMethod.startsWith("split_") && (!split || !split.valid)) { setError("Divisão inválida. Cada parte precisa ter no mínimo R$ 5,00."); return; }
      setStep("review");
    }
  }

  async function submit() {
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.errors[0]?.message || "Preencha os dados corretamente"); return; }
    if (paymentMethod.startsWith("split_") && (!split || !split.valid)) { setError("Divisão inválida."); return; }
    setLoading(true);
    setError(null);

    try {
      const f = parsed.data;
      const orderPayload = {
        user_id: user!.id,
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

      const cartSignature = items.map((i) => `${i.product.id}:${i.quantity}`).sort().join("|");
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, order_items(product_id, quantity)")
        .eq("user_id", user!.id)
        .eq("status", "pending_payment")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);

      const reusable = (recentOrders ?? []).find((o: any) => {
        const sig = (o.order_items ?? []).map((it: any) => `${it.product_id}:${it.quantity}`).sort().join("|");
        return sig === cartSignature;
      });

      let order: any;
      let isNewOrder = true;
      if (reusable) {
        const { data: updated, error: updateErr } = await supabase.from("orders").update(orderPayload as any).eq("id", reusable.id).select().single();
        if (updateErr) throw updateErr;
        order = updated;
        isNewOrder = false;
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("payments").delete().eq("order_id", order.id).eq("status", "pending");
      } else {
        const { data: inserted, error: orderErr } = await supabase.from("orders").insert(orderPayload as any).select().single();
        if (orderErr) throw orderErr;
        order = inserted;
      }

      supabase.from("profiles").update({
        full_name: f.name, cpf: f.doc, phone: f.phone, address_zip: f.zip, address_street: f.street,
        address_number: f.number, address_complement: f.complement || null, address_neighborhood: f.neighborhood,
        address_city: f.city, address_state: f.state,
      } as any).eq("user_id", user!.id).then(({ error }) => { if (error) console.error(error); });

      if (appliedCoupon && isNewOrder) await supabase.rpc("increment_coupon_usage" as any, { coupon_id: appliedCoupon.id });

      const orderItems = items.map((item) => ({
        order_id: order.id, product_id: item.product.id, product_name: item.product.name,
        quantity: item.quantity, unit_price: item.product.price,
        is_preorder: item.product.status === "preorder",
        preorder_estimated_delivery: item.product.preorder_estimated_delivery,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      if (isNewOrder) {
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "new-order", idempotencyKey: `new-order-${order.id}`,
            templateData: { orderId: order.id, customerName: user!.user_metadata?.full_name || user!.email, customerEmail: user!.email, total: totalPrice - discountAmount, amountDueNow, hasPreorderItems, createdAt: new Date().toLocaleString("pt-BR"), items: orderItems.map((it) => ({ name: it.product_name, quantity: it.quantity, unit_price: it.unit_price, is_preorder: it.is_preorder })) },
          },
        }).catch((e) => console.error(e));
        try {
          await supabase.functions.invoke("notify-telegram-order", {
            body: { orderId: order.id, customerName: user!.user_metadata?.full_name || user!.email, customerEmail: user!.email, total: totalPrice - discountAmount, amountDueNow, hasPreorderItems, items: orderItems.map((it) => ({ name: it.product_name, quantity: it.quantity, unit_price: it.unit_price, is_preorder: it.is_preorder })) },
          });
        } catch (e) { console.error(e); }
      }

      const paymentType = hasPreorderItems && regularTotal === 0 ? "preorder_deposit" : "full";
      const { error: paymentErr } = await supabase.from("payments").insert({
        order_id: order.id, payment_type: paymentType, amount: finalAmountDue, status: "pending",
      });
      if (paymentErr) throw paymentErr;

      const infinityItems = items.map((item) => {
        const isPreorder = item.product.status === "preorder";
        const unitPrice = isPreorder ? item.product.price * 0.4 : item.product.price;
        return { quantity: item.quantity, price: Math.round(unitPrice * 100), description: item.product.name };
      });

      if (totalDiscount > 0) {
        const totalCents = infinityItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const discountCents = Math.round(totalDiscount * 100);
        let remaining = discountCents;
        infinityItems.forEach((it, idx) => {
          const isLast = idx === infinityItems.length - 1;
          const share = isLast ? remaining : Math.floor((it.price * it.quantity * discountCents) / totalCents);
          const perUnit = Math.floor(share / it.quantity);
          it.price = Math.max(1, it.price - perUnit);
          remaining -= perUnit * it.quantity;
        });
      }

      const redirectUrl = `${window.location.origin}/pagamento-concluido`;

      if (paymentMethod.startsWith("split_") && split) {
        await supabase.from("orders").update({ payment_mode: "split", split_config: { combo: paymentMethod } } as any).eq("id", order.id);
        const { data: splitData, error: splitErr } = await supabase.functions.invoke("create-payment-mp", {
          body: {
            orderId: order.id, redirectUrl,
            parts: [
              { partIndex: 1, method: split.p1Method, amountCents: Math.round(split.p1Final * 100) },
              { partIndex: 2, method: split.p2Method, amountCents: Math.round(split.p2Final * 100) },
            ],
            customer: {
              name: f.name, email: f.email, phone: f.phone, doc: f.doc,
              address: { zip: f.zip, street: f.street, number: f.number, complement: f.complement, neighborhood: f.neighborhood, city: f.city, state: f.state },
            },
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

      const { data: paymentData, error: payErr } = await supabase.functions.invoke("create-payment-mp", {
        body: {
          orderId: order.id, items: infinityItems, redirectUrl,
          pixOnly: paymentMethod === "pix",
          customer: {
            name: f.name, email: f.email, phone: f.phone, doc: f.doc,
            address: { zip: f.zip, street: f.street, number: f.number, complement: f.complement, neighborhood: f.neighborhood, city: f.city, state: f.state },
          },
        },
      });

      if (payErr) {
        console.error("[CheckoutPro] payment error:", payErr);
        const detail = (payErr as any)?.context ? await (payErr as any).context.text().catch(() => null) : null;
        throw new Error(detail || payErr.message || "Erro ao criar pagamento");
      }

      if (paymentData?.payment_url) {
        clearCart();
        window.location.href = paymentData.payment_url;
      } else {
        toast.info("Pedido criado! O pagamento será configurado em breve.");
        clearCart();
        navigate("/minha-conta");
      }
    } catch (err: any) {
      console.error("[CheckoutPro] finalize error:", err);
      setError(err?.message || "Erro ao finalizar compra. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatInstallment = (v: number) => {
    const installment = v / 10;
    return `em 10x de ${formatBRL(installment)} no cartão`;
  };

  if (authLoading || !user || items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container flex-1 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2 text-center">Checkout</h1>
          <p className="text-center text-muted-foreground mb-8">Finalize sua compra com segurança</p>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8">
            {(["cart", "customer", "payment", "review"] as Step[]).map((s, idx) => (
              <div key={s} className="flex-1 flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === s ? "bg-primary text-primary-foreground" : ["cart", "customer", "payment"].indexOf(step) > idx ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {["cart", "customer", "payment"].indexOf(step) > idx ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                {idx < 3 && <div className={`flex-1 h-1 mx-2 ${["cart", "customer", "payment"].indexOf(step) > idx ? "bg-primary/40" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {step === "cart" && (
            <section className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-heading text-xl font-bold mb-4">Itens do pedido</h2>
                <div className="space-y-3">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">Qtd: {quantity}</p>
                      </div>
                      <p className="font-semibold">{formatBRL(product.price * quantity)}</p>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatBRL(totalPrice)}</span>
                </div>
                {hasPreorderItems && (
                  <p className="text-sm text-muted-foreground mt-2">* Produtos de encomenda: entrada de 40% no pedido.</p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-heading text-xl font-bold mb-4">Cupom de desconto</h2>
                <div className="flex gap-2">
                  <Input placeholder="Digite o código" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                  <Button onClick={applyCoupon} disabled={couponLoading}>{couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}</Button>
                </div>
                {appliedCoupon && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm">
                    <span>Cupom <strong>{appliedCoupon.code}</strong> aplicado</span>
                    <Button variant="ghost" size="sm" onClick={() => setAppliedCoupon(null)}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full" onClick={goNext}><ArrowRight className="mr-2 h-4 w-4" /> Continuar</Button>
            </section>
          )}

          {step === "customer" && (
            <section className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-heading text-xl font-bold">Dados pessoais</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2"><Label htmlFor="name">Nome completo / Razão social</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label htmlFor="doc">CPF ou CNPJ</Label><Input id="doc" value={form.doc} onChange={(e) => setForm({ ...form, doc: onlyDigits(e.target.value) })} placeholder="Somente números" /></div>
                  <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label htmlFor="phone">Telefone / WhatsApp</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: onlyDigits(e.target.value) })} placeholder="DDD + número" /></div>
                  <div className="relative"><Label htmlFor="zip">CEP</Label><Input id="zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: onlyDigits(e.target.value) })} onBlur={() => lookupCep(form.zip)} placeholder="00000000" />{cepLoading && <Loader2 className="absolute right-3 top-8 h-4 w-4 animate-spin text-muted-foreground" />}</div>
                  <div className="md:col-span-2"><Label htmlFor="street">Rua</Label><Input id="street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
                  <div><Label htmlFor="number">Número</Label><Input id="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                  <div><Label htmlFor="complement">Complemento</Label><Input id="complement" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} /></div>
                  <div><Label htmlFor="neighborhood">Bairro</Label><Input id="neighborhood" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></div>
                  <div><Label htmlFor="city">Cidade</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label htmlFor="state">UF</Label><Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} maxLength={2} /></div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("cart")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                <Button className="flex-1" onClick={goNext}><ArrowRight className="mr-2 h-4 w-4" /> Continuar</Button>
              </div>
            </section>
          )}

          {step === "payment" && (
            <section className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-heading text-xl font-bold mb-4">Forma de pagamento</h2>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-3">
                  <label className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="card" id="card" />
                      <div>
                        <p className="font-semibold">Cartão de crédito</p>
                        <p className="text-sm text-muted-foreground">{formatInstallment(amountDueNow)}</p>
                      </div>
                    </div>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </label>

                  <label className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${paymentMethod === "pix" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="pix" id="pix" />
                      <div>
                        <p className="font-semibold">PIX à vista</p>
                        <p className="text-sm text-green-600 font-medium">{formatBRL(amountDueNow - pixDiscount)} com 10% de desconto</p>
                      </div>
                    </div>
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                  </label>

                  <label className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${paymentMethod === "split_card_pix" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="split_card_pix" id="split_card_pix" />
                      <div>
                        <p className="font-semibold">Cartão + PIX</p>
                        <p className="text-sm text-muted-foreground">Divida entre cartão e PIX com desconto na parte PIX</p>
                      </div>
                    </div>
                    <Split className="h-5 w-5 text-muted-foreground" />
                  </label>

                  <label className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors ${paymentMethod === "split_card_card" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="split_card_card" id="split_card_card" />
                      <div>
                        <p className="font-semibold">2 cartões</p>
                        <p className="text-sm text-muted-foreground">Divida o valor entre dois cartões</p>
                      </div>
                    </div>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </label>
                </RadioGroup>

                {paymentMethod.startsWith("split_") && (
                  <div className="mt-6 rounded-xl bg-muted p-4 space-y-3">
                    <Label>Valor no primeiro cartão</Label>
                    <Input placeholder="0,00" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} />
                    {split && (
                      <div className="text-sm space-y-1">
                        <p>Primeiro cartão: <strong>{formatBRL(split.p1Final)}</strong></p>
                        <p>Segunda parte ({split.p2Method === "pix" ? "PIX" : "cartão"}): <strong>{formatBRL(split.p2Final)}</strong> {split.p2Method === "pix" && <span className="text-green-600">(inclui 10% de desconto)</span>}</p>
                        <p>Total efetivo: <strong>{formatBRL(split.effectiveTotal)}</strong></p>
                        {!split.valid && <p className="text-destructive text-xs">Cada parte deve ser no mínimo R$ 5,00.</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("customer")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                <Button className="flex-1" onClick={goNext}><ArrowRight className="mr-2 h-4 w-4" /> Revisar</Button>
              </div>
            </section>
          )}

          {step === "review" && (
            <section className="space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-heading text-xl font-bold">Revise seu pedido</h2>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Nome:</span> {form.name}</p>
                  <p><span className="text-muted-foreground">E-mail:</span> {form.email}</p>
                  <p><span className="text-muted-foreground">Telefone:</span> {form.phone}</p>
                  <p><span className="text-muted-foreground">Endereço:</span> {form.street}, {form.number}{form.complement ? ` - ${form.complement}` : ""}, {form.neighborhood}, {form.city} - {form.state}, {form.zip}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Desconto cupom</span><span>- {formatBRL(discountAmount)}</span></div>}
                  {paymentMethod === "pix" && <div className="flex justify-between text-sm text-green-600"><span>Desconto PIX</span><span>- {formatBRL(pixDiscount)}</span></div>}
                  {split && split.p2Method === "pix" && <div className="flex justify-between text-sm text-green-600"><span>Desconto na parte PIX</span><span>- {formatBRL(split.p2 * 0.1)}</span></div>}
                  <Separator />
                  <div className="flex justify-between text-xl font-bold"><span>Total a pagar</span><span>{formatBRL(finalAmountDue)}</span></div>
                  {paymentMethod === "card" && <p className="text-sm text-muted-foreground text-right">{formatInstallment(finalAmountDue)}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("payment")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                <Button size="lg" className="flex-1" onClick={submit} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockIcon />}
                  {loading ? "Processando..." : "Pagar agora"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
