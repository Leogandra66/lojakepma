import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const orderId = searchParams.get("order_id");
  const paymentStatus = searchParams.get("status");

  useEffect(() => {
    if (paymentStatus === "approved" || paymentStatus === "paid") {
      setStatus("success");
    } else if (paymentStatus === "rejected" || paymentStatus === "failed") {
      setStatus("error");
    } else {
      // Try to check via DB
      if (orderId) {
        supabase.from("payments").select("status").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).single()
          .then(({ data }) => {
            if (data?.status === "paid" || data?.status === "approved") {
              setStatus("success");
            } else {
              setStatus("error");
            }
          });
      } else {
        setStatus("error");
      }
    }
  }, [orderId, paymentStatus]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="text-center space-y-6 max-w-md">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
              <h1 className="font-heading text-2xl font-bold">Verificando pagamento...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-20 w-20 mx-auto text-success" />
              <h1 className="font-heading text-3xl font-bold">Pagamento Confirmado!</h1>
              <p className="text-muted-foreground">Seu pedido foi registrado com sucesso. Você receberá uma confirmação em breve.</p>
              <div className="flex gap-3 justify-center">
                <Link to="/minha-conta"><Button className="btn-gold rounded-full">Meus Pedidos</Button></Link>
                <Link to="/"><Button variant="outline" className="rounded-full">Continuar Comprando</Button></Link>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-20 w-20 mx-auto text-destructive" />
              <h1 className="font-heading text-3xl font-bold">Pagamento não confirmado</h1>
              <p className="text-muted-foreground">Houve um problema com o pagamento. Tente novamente ou entre em contato conosco.</p>
              <Link to="/"><Button className="btn-gold rounded-full">Voltar à Loja</Button></Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
