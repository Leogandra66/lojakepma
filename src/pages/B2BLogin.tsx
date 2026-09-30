import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import kepmaLogo from "@/assets/kepma-logo.webp";
import { toast } from "sonner";

export default function B2BLogin() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(Boolean(user));
  const [access, setAccess] = useState<"approved" | "pending" | "refused" | "none" | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) {
      setChecking(false);
      setAccess(null);
      return;
    }
    setChecking(true);
    supabase.from("b2b_accounts").select("status, account_type").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.account_type === "representante" && data.status === "aprovado") setAccess("approved");
        else if (data?.status === "pendente") setAccess("pending");
        else if (data?.status === "recusado") setAccess("refused");
        else setAccess("none");
        setChecking(false);
      });
  }, [user]);

  if (!authLoading && !checking && access === "approved") {
    return <Navigate to={searchParams.get("redirect") || "/b2b"} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(searchParams.get("redirect") || "/b2b", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  const blockedMessage = access === "pending"
    ? "Seu acesso comercial ainda aguarda aprovação."
    : access === "refused"
      ? "Seu acesso comercial não está ativo."
      : access === "none"
        ? "Esta conta não está cadastrada como representante."
        : null;

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.7fr)]">
      <section className="hidden bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-between">
        <img src={kepmaLogo} alt="Kepma" className="h-10 w-auto self-start brightness-0 invert" />
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-primary">Kepma Brasil</p>
          <h1 className="text-5xl font-semibold leading-tight">Área comercial para representantes</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-background/70">Consulte o catálogo de atacado, organize sua carteira de clientes e envie pedidos para aprovação.</p>
        </div>
        <p className="text-xs text-background/50">Acesso exclusivo para representantes previamente aprovados.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar à loja</Link>
          <div className="mb-8 lg:hidden"><img src={kepmaLogo} alt="Kepma" className="h-10 w-auto" /></div>
          <LockKeyhole className="mb-5 h-8 w-8 text-primary" />
          <h2 className="text-3xl font-semibold">Acesso B2B</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Entre com o e-mail e a senha associados ao seu cadastro comercial.</p>

          {blockedMessage ? (
            <div className="mt-8 space-y-5 border-l-2 border-primary pl-5">
              <p className="font-medium">{blockedMessage}</p>
              <p className="text-sm text-muted-foreground">Fale com a equipe Kepma para revisar seu cadastro.</p>
              <Button variant="outline" onClick={() => void signOut()}>Entrar com outra conta</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2"><Label htmlFor="b2b-email">E-mail</Label><Input id="b2b-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="b2b-password">Senha</Label><PasswordInput id="b2b-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting || authLoading || checking}>
                {(submitting || authLoading || checking) && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
              </Button>
              <Link to="/recuperar-senha" className="block text-center text-sm text-primary hover:underline">Esqueci minha senha</Link>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}