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
  const [nextPart, setNextPart] = useState<{ initPoint: string; method: string; amountCents: number } | null>(null);
  const [splitDone, setSplitDone] = useState(false);

  // InfinitePay return params
  const orderNsu = searchParams.get("order_nsu");
  const receiptUrl = searchParams.get("receipt_url");
  const slug = searchParams.get("slug");
  const captureMethod = searchParams.get("capture_method");
  const transactionNsu = searchParams.get("transaction_nsu");

  // Mercado Pago return params
  const mpExternalRefRaw = searchParams.get("external_reference") || "";
  const mpStatus = searchParams.get("status") || searchParams.get("collection_status");
  const partParam = searchParams.get("part");
  // externalRef format may be "orderId" or "orderId:partIndex"
  const [refOrderId, refPartStr] = mpExternalRefRaw.split(":");
  const currentPart = partParam ? parseInt(partParam, 10) : (refPartStr ? parseInt(refPartStr, 10) : null);
  const isMercadoPago = !!mpExternalRefRaw || !!searchParams.get("payment_id") || !!searchParams.get("preference_id");
  const isSplitReturn = currentPart === 1 || currentPart === 2;

  useEffect(() => {
    const run = async () => {
      // Split return: check other part
      if (isSplitReturn && refOrderId) {
        try {
          const { data: partsData } = await (supabase as any)
            .from("order_payment_parts")
            .select("part_index, status, mp_init_point, method, amount_cents")
            .eq("order_id", refOrderId)
            .order("part_index");
          const parts = (partsData ?? []) as any[];
          const other = (parts ?? []).find((p: any) => p.part_index !== currentPart);
          const bothApproved = (parts ?? []).length === 2 && (parts ?? []).every((p: any) => p.status === "approved");
          if (bothApproved) {
            setSplitDone(true);
          } else if (other && other.status !== "approved" && other.mp_init_point) {
            setNextPart({
              initPoint: other.mp_init_point,
              method: other.method,
              amountCents: other.amount_cents,
            });
          }
        } catch (e) {
          console.error("Failed to load split parts:", e);
        } finally {
          setSaving(false);
        }
        return;
      }

      if (isMercadoPago) {
        setSaving(false);
        return;
      }

      if (!orderNsu) {
        setSaving(false);
        return;
      }

      try {
        const { error: paymentError } = await supabase
          .from("payments")
          .update({
            receipt_url: receiptUrl,
            slug: slug,
            capture_method: captureMethod,
            transaction_nsu: transactionNsu,
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("order_id", orderNsu)
          .eq("status", "pending");
        if (paymentError) console.error("Error updating payment:", paymentError);

        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderNsu);
        if (orderError) console.error("Error updating order:", orderError);
      } catch (err) {
        console.error("Error saving payment info:", err);
      } finally {
        setSaving(false);
      }
    };
    run();
  }, [orderNsu, receiptUrl, slug, captureMethod, transactionNsu, isMercadoPago, isSplitReturn, refOrderId, currentPart]);

  const mpPending = isMercadoPago && mpStatus !== "approved" && !isSplitReturn;
  const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

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
          ) : nextPart ? (
            <>
              <CheckCircle2 className="h-20 w-20 mx-auto text-green-600" />
              <h1 className="font-heading text-3xl font-bold">1ª parte recebida!</h1>
              <p className="text-muted-foreground">
                Falta pagar a 2ª parte via <strong>{nextPart.method === "pix" ? "PIX" : "Cartão"}</strong> no valor de <strong>{formatBRL(nextPart.amountCents)}</strong> para concluir seu pedido.
              </p>
              <Button
                size="lg"
                className="btn-gold rounded-full"
                onClick={() => (window.location.href = nextPart.initPoint)}
              >
                Pagar 2ª parte agora
              </Button>
              <p className="text-xs text-muted-foreground">
                Se preferir, pode pagar mais tarde acessando "Meus Pedidos".
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-20 w-20 mx-auto text-primary" />
              <h1 className="font-heading text-3xl font-bold">
                {splitDone ? "Pagamento concluído!" : "Obrigado pela sua compra!"}
              </h1>
              <p className="text-muted-foreground">
                {mpPending
                  ? "Seu pedido foi registrado. Assim que o pagamento for confirmado, o status será atualizado automaticamente em \"Meus Pedidos\"."
                  : <>Seu pedido foi registrado com sucesso. Acompanhe o status do pagamento na seção <strong>"Meus Pedidos"</strong> na sua conta.</>}
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
