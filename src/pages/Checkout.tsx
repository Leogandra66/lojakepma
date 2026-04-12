import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
}

export default function Checkout() {
  const { items, totalPrice, preorderTotal, regularTotal, hasPreorderItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const depositAmount = preorderTotal * 0.4;
  const subtotal = regularTotal + depositAmount;

  // Calculate discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discountAmount = totalPrice * (appliedCoupon.discount_value / 100);
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
    // Discount cannot exceed the amount due
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const amountDueNow = subtotal - discountAmount;

  if (!user) {
    navigate("/entrar?redirect=/checkout");
    return null;
  }

  if (items.length === 0) {
    navigate("/carrinho");
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

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("Este cupom expirou");
        return;
      }

      // Check usage limit
      if (data.max_uses && data.used_count >= data.max_uses) {
        toast.error("Este cupom atingiu o limite de usos");
        return;
      }

      // Check min order value
      if (data.min_order_value && totalPrice < Number(data.min_order_value)) {
        toast.error(`Pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace(".", ",")} para este cupom`);
        return;
      }

      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type as "percentage" | "fixed",
        discount_value: Number(data.discount_value),
      });
      setCouponCode("");
      toast.success("Cupom aplicado!");
    } catch {
      toast.error("Erro ao validar cupom");
    } finally {
      setCouponLoading(false);
    }
  }

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total: totalPrice - discountAmount,
          has_preorder_items: hasPreorderItems,
          status: "pending_payment",
          coupon_id: appliedCoupon?.id || null,
          discount_amount: discountAmount,
        } as any)
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Increment coupon used_count
      if (appliedCoupon) {
        await supabase.rpc("increment_coupon_usage" as any, { coupon_id: appliedCoupon.id });
      }

      // Create order items
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

      // Create payment record
      const paymentType = hasPreorderItems && regularTotal === 0 ? "preorder_deposit" : "full";
      const { error: paymentErr } = await supabase.from("payments").insert({
        order_id: order.id,
        payment_type: paymentType,
        amount: amountDueNow,
        status: "pending",
      });
      if (paymentErr) throw paymentErr;

      // Build items for InfinitePay (prices in cents)
      const infinityItems = items.map((item) => {
        const isPreorder = item.product.status === "preorder";
        const unitPrice = isPreorder ? item.product.price * 0.4 : item.product.price;
        return {
          quantity: item.quantity,
          price: Math.round(unitPrice * 100),
          description: item.product.name,
        };
      });

      // If there's a discount, add as negative line item
      if (discountAmount > 0) {
        infinityItems.push({
          quantity: 1,
          price: -Math.round(discountAmount * 100),
          description: `Desconto (${appliedCoupon!.code})`,
        });
      }

      const origin = window.location.origin;
      const redirectUrl = `${origin}/pagamento-concluido`;

      const { data: paymentData, error: payErr } = await supabase.functions.invoke("create-payment", {
        body: { orderId: order.id, items: infinityItems, redirectUrl },
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
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Pagar com InfinityPay"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
