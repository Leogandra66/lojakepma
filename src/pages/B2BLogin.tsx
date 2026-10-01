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
import { z } from "zod";

const representativeSchema = z.object({
  companyName: z.string().trim().min(2, "Informe seu nome ou empresa.").max(160, "Nome muito longo."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255, "E-mail muito longo."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(72, "Senha muito longa."),
  document: z.string().trim().max(30, "Documento muito longo."),
  phone: z.string().trim().max(30, "Telefone muito longo."),
});

export default function B2BLogin() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupComplete, setSignupComplete] = useState(false);
  const [existingEmail, setExistingEmail] = useState(false);
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

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    const parsed = representativeSchema.safeParse({ companyName, email, password, document, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Revise os dados informados.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/b2b/entrar`,
          data: {
            full_name: parsed.data.companyName,
            account_request: "representante",
            company_name: parsed.data.companyName,
            document: parsed.data.document,
            phone: parsed.data.phone,
          },
        },
      });
      if (error) throw error;
      if (data.user && data.user.identities?.length === 0) {
        setExistingEmail(true);
        return;
      }
      setSignupComplete(true);
      if (data.session) setAccess("pending");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível solicitar o cadastro.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestAccessForCurrentAccount(event: React.FormEvent) {
    event.preventDefault();
    const parsed = representativeSchema.omit({ email: true, password: true }).safeParse({ companyName, document, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Revise os dados informados.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_b2b_representative_access", {
        _company_name: parsed.data.companyName,
        _document: parsed.data.document || undefined,
        _phone: parsed.data.phone || undefined,
      });
      if (error) throw error;
      setAccess("pending");
      toast.success("Solicitação enviada para aprovação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a solicitação.");
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
          <h2 className="text-3xl font-semibold">{mode === "login" ? "Acesso B2B" : "Cadastro de representante"}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode === "login" ? "Entre com o e-mail e a senha associados ao seu cadastro comercial." : "Crie sua conta e envie a solicitação para análise da equipe Kepma."}</p>

          {existingEmail ? (
            <div className="mt-8 space-y-4 border-l-2 border-primary pl-5">
              <p className="font-medium">Este e-mail já possui uma conta na loja.</p>
              <p className="text-sm leading-6 text-muted-foreground">Entre com a senha dessa conta. Depois do login, você poderá solicitar o acesso como representante.</p>
              <Button onClick={() => { setMode("login"); setExistingEmail(false); }}>Entrar com esta conta</Button>
              <Link to="/recuperar-senha" className="block text-sm text-primary hover:underline">Esqueci minha senha</Link>
            </div>
          ) : signupComplete ? (
            <div className="mt-8 space-y-4 border-l-2 border-primary pl-5">
              <p className="font-medium">Cadastro recebido.</p>
              <p className="text-sm leading-6 text-muted-foreground">Confirme seu e-mail. Depois da confirmação, sua solicitação ficará aguardando aprovação administrativa.</p>
              <Button variant="outline" onClick={() => { setMode("login"); setSignupComplete(false); }}>Voltar para entrar</Button>
            </div>
          ) : blockedMessage && access !== "none" ? (
            <div className="mt-8 space-y-5 border-l-2 border-primary pl-5">
              <p className="font-medium">{blockedMessage}</p>
              <p className="text-sm text-muted-foreground">Fale com a equipe Kepma para revisar seu cadastro.</p>
              <Button variant="outline" onClick={() => void signOut()}>Entrar com outra conta</Button>
            </div>
          ) : access === "none" ? (
            <form onSubmit={requestAccessForCurrentAccount} className="mt-8 space-y-5">
              <p className="text-sm font-medium">Solicite o acesso comercial para esta conta.</p>
              <div className="space-y-2"><Label htmlFor="existing-company">Nome ou empresa *</Label><Input id="existing-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={160} required /></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="existing-document">Documento</Label><Input id="existing-document" value={document} onChange={(e) => setDocument(e.target.value)} maxLength={30} /></div><div className="space-y-2"><Label htmlFor="existing-phone">Telefone</Label><Input id="existing-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></div></div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Solicitar aprovação</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => void signOut()}>Entrar com outra conta</Button>
            </form>
          ) : mode === "login" ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2"><Label htmlFor="b2b-email">E-mail</Label><Input id="b2b-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="b2b-password">Senha</Label><PasswordInput id="b2b-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting || authLoading || checking}>
                {(submitting || authLoading || checking) && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
              </Button>
              <Link to="/recuperar-senha" className="block text-center text-sm text-primary hover:underline">Esqueci minha senha</Link>
              <p className="text-center text-sm text-muted-foreground">Ainda não tem acesso? <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setMode("signup")}>Solicitar cadastro</button></p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="mt-8 space-y-4">
              <div className="space-y-2"><Label htmlFor="signup-company">Nome ou empresa *</Label><Input id="signup-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={160} required /></div>
              <div className="space-y-2"><Label htmlFor="signup-email">E-mail *</Label><Input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required /></div>
              <div className="space-y-2"><Label htmlFor="signup-password">Senha *</Label><PasswordInput id="signup-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} maxLength={72} required /></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="signup-document">Documento</Label><Input id="signup-document" value={document} onChange={(e) => setDocument(e.target.value)} maxLength={30} /></div><div className="space-y-2"><Label htmlFor="signup-phone">Telefone</Label><Input id="signup-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></div></div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Criar conta e solicitar</Button>
              <p className="text-center text-sm text-muted-foreground">Já possui cadastro? <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setMode("login")}>Entrar</button></p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}