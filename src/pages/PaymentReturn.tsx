import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const [saving, setSaving] = useState(true);

  const orderNsu = searchParams.get("order_nsu");
  const receiptUrl = searchParams.get("receipt_url");
  const slug = searchParams.get("slug");
  const captureMethod = searchParams.get("capture_method");
  const transactionNsu = searchParams.get("transaction_nsu");

  useEffect(() => {
    const savePaymentInfo = async () => {
      if (!orderNsu) {
        setSaving(false);
        return;
      }

      try {
        // Update payment record with InfinitePay return data
        await supabase
          .from("payments")
          .update({
            receipt_url: receiptUrl,
            slug: slug,
            capture_method: captureMethod,
            transaction_nsu: transactionNsu,
            status: "paid",
            paid_at: new Date().toISOString(),
          } as any)
          .eq("order_id", orderNsu)
          .eq("status", "pending");

        // Update order status
        await supabase
          .from("orders")
          .update({ status: "paid" } as any)
          .eq("id", orderNsu);
      } catch (err) {
        console.error("Error saving payment info:", err);
      } finally {
        setSaving(false);
      }
    };

    savePaymentInfo();
  }, [orderNsu, receiptUrl, slug, captureMethod, transactionNsu]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="text-center space-y-6 max-w-md">
          {saving ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
              <h1 className="font-heading text-2xl font-bold">Processando pagamento...</h1>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-20 w-20 mx-auto text-primary" />
              <h1 className="font-heading text-3xl font-bold">Obrigado pela sua compra!</h1>
              <p className="text-muted-foreground">
                Seu pedido foi registrado com sucesso. Acompanhe o status do pagamento na seção <strong>"Meus Pedidos"</strong> na sua conta.
              </p>
              {receiptUrl && (
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="rounded-full">Ver Comprovante</Button>
                </a>
              )}
              <div className="flex gap-3 justify-center pt-2">
                <Link to="/minha-conta">
                  <Button className="btn-gold rounded-full">Meus Pedidos</Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="rounded-full">Continuar Comprando</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
