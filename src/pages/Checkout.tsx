import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const { items, totalPrice, preorderTotal, regularTotal, hasPreorderItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const depositAmount = preorderTotal * 0.4;
  const amountDueNow = regularTotal + depositAmount;

  if (!user) {
    navigate("/entrar?redirect=/checkout");
    return null;
  }

  if (items.length === 0) {
    navigate("/carrinho");
    return null;
  }

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total: totalPrice,
          has_preorder_items: hasPreorderItems,
          status: "pending_payment",
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

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

      // Call InfinityPay edge function
      const { data: paymentData, error: payErr } = await supabase.functions.invoke("create-payment", {
        body: { orderId: order.id, amount: amountDueNow },
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
                <span className="font-semibold">R$ {(product.price * quantity).toFixed(2).replace(".", ",")}</span>
              </div>
            ))}
          </div>

          {hasPreorderItems && (
            <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm space-y-1">
              <p><strong>Itens em estoque:</strong> R$ {regularTotal.toFixed(2).replace(".", ",")}</p>
              <p><strong>Encomendas (40% agora):</strong> R$ {depositAmount.toFixed(2).replace(".", ",")}</p>
              <p className="text-muted-foreground">Os 60% restantes das encomendas serão cobrados na entrega.</p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6 flex justify-between items-center">
            <span className="font-heading text-xl font-bold">Total a pagar agora:</span>
            <span className="font-heading text-2xl font-bold">R$ {amountDueNow.toFixed(2).replace(".", ",")}</span>
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
