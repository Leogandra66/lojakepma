import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 as LoaderIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Tag, X } from "lucide-react";

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  eligible_product_ids: string[] | null; // null = all products
}

export default function Checkout() {
  const { items, totalPrice, preorderTotal, regularTotal, hasPreorderItems, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<false | "default" | "pix">(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

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

  const handleCheckout = async (pix = false) => {
    setLoading(pix ? "pix" : "default");
    try {
      // PIX gives an extra 10% discount on the amount due now (stacks with coupon)
      const pixDiscount = pix ? amountDueNow * 0.1 : 0;
      const totalDiscount = discountAmount + pixDiscount;
      const finalAmountDue = amountDueNow - pixDiscount;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total: totalPrice - totalDiscount,
          has_preorder_items: hasPreorderItems,
          status: "pending_payment",
          coupon_id: appliedCoupon?.id || null,
          discount_amount: totalDiscount,
        } as any)
        .select()
        .single();

      if (orderErr) throw orderErr;

      if (appliedCoupon) {
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
      console.error(err);
      toast.error("Erro ao finalizar compra: " + (err.message || "tente novamente"));
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
          </div>

          <Button size="lg" className="btn-gold w-full rounded-full text-base" onClick={handleCheckout} disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Pagar com Mercado Pago"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
