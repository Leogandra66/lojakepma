import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setState("invalid");
          return;
        }
        if (data.valid === true) setState("ready");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function confirm() {
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setState("success");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else {
        setErrorMsg(data?.error || "Falha ao processar.");
        setState("error");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Erro inesperado.");
      setState("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-16">
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Cancelar inscrição</h1>

          {state === "validating" && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {state === "ready" && (
            <>
              <p className="text-muted-foreground mb-6">
                Confirme abaixo para deixar de receber e-mails.
              </p>
              <Button onClick={confirm} className="w-full">Confirmar cancelamento</Button>
            </>
          )}

          {state === "submitting" && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {state === "success" && (
            <p className="text-muted-foreground">
              Pronto! Você não receberá mais e-mails neste endereço.
            </p>
          )}

          {state === "already" && (
            <p className="text-muted-foreground">
              Este e-mail já foi removido da nossa lista.
            </p>
          )}

          {state === "invalid" && (
            <p className="text-muted-foreground">
              Link inválido ou expirado.
            </p>
          )}

          {state === "error" && (
            <p className="text-destructive">{errorMsg}</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
