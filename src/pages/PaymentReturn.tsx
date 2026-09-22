import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, Loader2, AlertCircle, QrCode, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(true);
  const [nextPart, setNextPart] = useState<{ initPoint: string; method: string; amountCents: number } | null>(null);
  const [splitDone, setSplitDone] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [isPixFallback, setIsPixFallback] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);

  const orderNsu = searchParams.get("order_nsu");
  const receiptUrl = searchParams.get("receipt_url");
  const slug = searchParams.get("slug");
  const captureMethod = searchParams.get("capture_method");
  const transactionNsu = searchParams.get("transaction_nsu");

  const mpExternalRefRaw = searchParams.get("external_reference") || "";
  const mpStatus = searchParams.get("status") || searchParams.get("collection_status");
  const partParam = searchParams.get("part");
  const [refOrderId, refPartStr] = mpExternalRefRaw.split(":");
  const currentPart = partParam ? parseInt(partParam, 10) : (refPartStr ? parseInt(refPartStr, 10) : null);
  const isMercadoPago = !!mpExternalRefRaw || !!searchParams.get("payment_id") || !!searchParams.get("preference_id");
  const isSplitReturn = currentPart === 1 || currentPart === 2;
  const isMpFailure = isMercadoPago && (mpStatus === "failure" || mpStatus === "rejected" || mpStatus === "cancelled");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const loadOrderStatus = async (orderId: string) => {
      try {
        const { data, error } = await supabase.from("orders").select("status, total, discount_amount").eq("id", orderId).maybeSingle();
        if (error) throw error;
        setOrderStatus(data?.status ?? null);
        return data;
      } catch (e) {
        console.error("Failed to load order status:", e);
        return null;
      }
    };

    const loadPaymentFailureReason = async (orderId: string) => {
      try {
        const { data } = await supabase
          .from("payments")
          .select("metadata, status")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const meta = data?.metadata as any;
        const detail = meta?.mp_status_detail || meta?.mp_error?.cause?.[0]?.description || meta?.mp_error?.message;
        if (detail) setFailureReason(detail);
      } catch (e) {
        console.error(e);
      }
    };

    const run = async () => {
      if (isSplitReturn && refOrderId) {
        try {
          const currentOrder = await loadOrderStatus(refOrderId);
          if (currentOrder?.status === "paid") {
            setSplitDone(true);
            setSaving(false);
            return;
          }
          const { data: partsData } = await (supabase as any)
            .from("order_payment_parts")
            .select("part_index, status, mp_init_point, method, amount_cents")
            .eq("order_id", refOrderId)
            .order("part_index");
          const parts = (partsData ?? []) as any[];
          const other = parts.find((p: any) => p.part_index !== currentPart);
          const bothApproved = parts.length === 2 && parts.every((p: any) => p.status === "approved");
          if (bothApproved) {
            setSplitDone(true);
          } else if (other && other.status !== "approved" && other.mp_init_point) {
            setNextPart({ initPoint: other.mp_init_point, method: other.method, amountCents: other.amount_cents });
          }
        } catch (e) {
          console.error("Failed to load split parts:", e);
        } finally {
          setSaving(false);
        }
        return;
      }

      if (isMercadoPago) {
        if (isMpFailure && refOrderId) {
          setPaymentFailed(true);
          await loadOrderStatus(refOrderId);
          await loadPaymentFailureReason(refOrderId);
        } else if (refOrderId) {
          const currentOrder = await loadOrderStatus(refOrderId);
          if (currentOrder?.status !== "paid") {
            let attempts = 0;
            interval = setInterval(async () => {
              attempts += 1;
              const refreshed = await loadOrderStatus(refOrderId);
              if (refreshed?.status === "paid" || attempts >= 12) {
                if (interval) clearInterval(interval);
              }
            }, 5000);
          }
        }
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
          .update({ receipt_url: receiptUrl, slug, capture_method: captureMethod, transaction_nsu: transactionNsu, status: "paid", paid_at: new Date().toISOString() })
          .eq("order_id", orderNsu)
          .eq("status", "pending");
        if (paymentError) console.error("Error updating payment:", paymentError);

        const { error: orderError } = await supabase.from("orders").update({ status: "paid" }).eq("id", orderNsu);
        if (orderError) console.error("Error updating order:", orderError);
      } catch (err) {
        console.error("Error saving payment info:", err);
      } finally {
        setSaving(false);
      }
    };
    run();

    return () => { if (interval) clearInterval(interval); };
  }, [orderNsu, receiptUrl, slug, captureMethod, transactionNsu, isMercadoPago, isSplitReturn, refOrderId, currentPart, isMpFailure]);

  const handlePixFallback = async () => {
    if (!refOrderId) return;
    setPixLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/pagamento-concluido`;
      const { data: orderData } = await supabase.from("orders").select("total, discount_amount").eq("id", refOrderId).maybeSingle();
      const orderTotal = orderData?.total ?? 0;
      const discount = orderData?.discount_amount ?? 0;
      const pixAmount = (orderTotal - discount) * 0.9;

      await supabase.from("payments").delete().eq("order_id", refOrderId).eq("status", "pending");
      await supabase.from("payments").insert({ order_id: refOrderId, payment_type: "full", amount: pixAmount, status: "pending" });

      const { data, error } = await supabase.functions.invoke("create-payment-mp", {
        body: { orderId: refOrderId, redirectUrl, pixOnly: true },
      });
      if (error) throw error;
      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error("Não foi possível gerar o PIX. Tente novamente.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao gerar PIX");
    } finally {
      setPixLoading(false);
    }
  };

  const mpPending = isMercadoPago && mpStatus !== "approved" && !isSplitReturn && !paymentFailed;
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
          ) : paymentFailed ? (
            <>
              <AlertCircle className="h-20 w-20 mx-auto text-destructive" />
              <h1 className="font-heading text-3xl font-bold">Cartão não aprovado</h1>
              <p className="text-muted-foreground">
                {failureReason
                  ? `Motivo: ${failureReason}`
                  : "O pagamento não foi aprovado pela operadora. Isso pode acontecer por limite, dados incorretos ou análise de risco."}
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handlePixFallback}
                  disabled={pixLoading}
                >
                  {pixLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Pagar com PIX (10% de desconto)
                </Button>
                {refOrderId && (
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/checkout-pro?retry=${refOrderId}`)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Tentar outro cartão
                  </Button>
                )}
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link to="/minha-conta"><Button variant="outline" className="rounded-full">Meus Pedidos</Button></Link>
                  <Link to="/"><Button variant="outline" className="rounded-full">Continuar Comprando</Button></Link>
                </div>
              </div>
            </>
          ) : nextPart ? (
            <>
              <CheckCircle2 className="h-20 w-20 mx-auto text-green-600" />
              <h1 className="font-heading text-3xl font-bold">1ª parte recebida!</h1>
              <p className="text-muted-foreground">
                Falta pagar a 2ª parte via <strong>{nextPart.method === "pix" ? "PIX" : "Cartão"}</strong> no valor de <strong>{formatBRL(nextPart.amountCents)}</strong> para concluir seu pedido.
              </p>
              <Button size="lg" className="btn-gold rounded-full" onClick={() => (window.location.href = nextPart.initPoint)}>
                Pagar 2ª parte agora
              </Button>
              <p className="text-xs text-muted-foreground">Se preferir, pode pagar mais tarde acessando "Meus Pedidos".</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-20 w-20 mx-auto text-primary" />
              <h1 className="font-heading text-3xl font-bold">{splitDone ? "Pagamento concluído!" : "Obrigado pela sua compra!"}</h1>
              <p className="text-muted-foreground">
                {mpPending
                  ? "Seu pedido foi registrado. Assim que o pagamento for confirmado, o status será atualizado automaticamente em \"Meus Pedidos\"."
                  : <>Seu pedido foi registrado com sucesso. Acompanhe o status do pagamento na seção <strong>"Meus Pedidos"</strong> na sua conta.</>}
              </p>
              {orderStatus && (
                <p className="text-sm text-muted-foreground">
                  Status do pedido: <span className="font-semibold capitalize">{orderStatus.replace("_", " ")}</span>
                </p>
              )}
              {receiptUrl && (
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="rounded-full">Ver Comprovante</Button>
                </a>
              )}
              <div className="flex gap-3 justify-center pt-2">
                <Link to="/minha-conta"><Button className="btn-gold rounded-full">Meus Pedidos</Button></Link>
                <Link to="/"><Button variant="outline" className="rounded-full">Continuar Comprando</Button></Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
