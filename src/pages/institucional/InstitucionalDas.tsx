import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { InstitutionalLayout } from "./shared";
import launchVideo from "@/assets/kepma-a1-das-lancamento.mp4.asset.json";

const schema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Telefone inválido").max(30).regex(/^[0-9()+\-\s]+$/, "Telefone inválido"),
});

const benefits: [string, string][] = [
  ["Tocabilidade personalizada", "ajuste a altura das cordas de acordo com seu estilo e sua preferência."],
  ["Mais conforto", "experimente uma ação mais baixa para facilitar acordes com pestana, passagens rápidas e técnicas de fingerstyle."],
  ["Versatilidade", "prefira uma ação um pouco mais alta quando sua pegada exigir mais espaço para a vibração das cordas."],
  ["Adaptação ao ambiente", "compense alterações na tocabilidade associadas às mudanças de temperatura, umidade e às condições de uso."],
  ["Menos intervenções invasivas", "ajuste o ângulo do braço sem precisar desmontar sua fixação ou recorrer imediatamente a modificações no rastilho."],
];

const VIDEOS = [
  {
    src: "https://player.bilibili.com/player.html?bvid=BV1SgeF6NEGB&autoplay=0&danmaku=0&high_quality=1",
    title: "Kepma DAS — vídeo do Bilibili",
    caption: "",
  },
];

export default function InstitucionalDas() {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError(""); setStatus("sending");
    const id = crypto.randomUUID();
    const { error: insErr } = await supabase.from("das_prelaunch_leads").insert({ id, name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone });
    if (insErr) { setStatus("error"); setError("Não foi possível enviar. Tente novamente."); return; }
    supabase.functions.invoke("send-transactional-email", {
      body: { templateName: "das-interest", idempotencyKey: `das-interest-${id}`, templateData: { ...parsed.data, createdAt: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) } },
    }).catch(() => {});
    setStatus("done");
  };

  return (
    <InstitutionalLayout title="Kepma DAS — Pré-lançamento no Brasil">
      <section className="container max-w-3xl pt-32 pb-12">
        <p className="mb-3 text-sm uppercase tracking-[0.4em] text-primary">Pré-lançamento no Brasil</p>
        <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">Kepma DAS: uma nova forma de pensar a tocabilidade.</h1>
        <p className="mt-6 text-lg text-background/80">E se você pudesse ajustar a altura das cordas do seu violão mudando o ângulo do braço, sem precisar desmontá-lo?</p>
        <p className="mt-4 text-background/70">Conheça o <strong>DAS — Dynamic Action System</strong>, a nova tecnologia da Kepma que coloca um nível inédito de controle da tocabilidade nas mãos do músico.</p>

        <h2 className="mt-10 font-display text-2xl font-bold">Como funciona?</h2>
        <p className="mt-3 text-background/70">Diferentemente dos violões tradicionais, que podem exigir uma intervenção técnica para corrigir o ângulo do braço, o DAS permite fazer esse ajuste de maneira simples e precisa, utilizando uma chave Allen no mecanismo integrado ao encaixe do braço.</p>

        <h2 className="mt-10 font-display text-2xl font-bold">O que isso muda na prática?</h2>
        <ul className="mt-4 space-y-3">
          {benefits.map(([t, d]) => (
            <li key={t} className="text-background/70"><strong className="text-background">{t}:</strong> {d}</li>
          ))}
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">DAS não é a mesma coisa que o tensor</h2>
        <p className="mt-3 text-background/70">O tensor regula a curvatura do braço. O DAS regula o ângulo do braço em relação ao corpo, influenciando diretamente a altura das cordas. São sistemas diferentes e complementares.</p>
        <p className="mt-3 text-background/70">A Kepma combina essa liberdade de ajuste com sua tecnologia de precisão PLEK, utilizada na regulagem de fábrica, para unir precisão de construção e flexibilidade de uso.</p>
        <p className="mt-6 text-lg font-semibold">O resultado? Você não precisa simplesmente se adaptar ao violão. Pode ajustar o violão à sua maneira de tocar.</p>
        <p className="mt-3 text-background/70">Isso é inovação aplicada a um dos aspectos mais importantes de qualquer instrumento: a conexão entre o músico e a música.</p>
        <p className="mt-6 font-display text-xl font-bold tracking-wide">KEPMA DAS. SUA MÚSICA. SUA TOCABILIDADE.</p>
      </section>

      <section className="container pb-12">
        <video src={launchVideo.url} controls playsInline preload="metadata" className="aspect-video w-full rounded-3xl bg-background/5 object-cover" />
      </section>

      <section className="container max-w-3xl pb-24">
        <div className="rounded-3xl border border-background/15 bg-background/5 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-background/60">Preço de pré-lançamento</p>
          <p className="mt-2 font-display text-4xl font-bold text-primary md:text-5xl">R$ 11.990,00</p>
        </div>

        <div className="mt-8 rounded-3xl border border-background/15 p-8">
          <h2 className="font-display text-2xl font-bold">Quero receber mais detalhes</h2>
          <p className="mt-2 text-background/60">Deixe seus contatos e avisaremos sobre o lançamento no Brasil.</p>
          {status === "done" ? (
            <p className="mt-6 text-lg font-medium text-primary">Obrigado! Recebemos seus dados e entraremos em contato.</p>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4">
              {([["name", "Nome", "text"], ["email", "E-mail", "email"], ["phone", "Telefone / WhatsApp", "tel"]] as const).map(([k, l, t]) => (
                <label key={k} className="grid gap-1 text-sm">
                  <span className="text-background/70">{l}</span>
                  <input type={t} required maxLength={k === "email" ? 255 : 120} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="rounded-xl border border-background/20 bg-transparent px-4 py-3 text-background outline-none focus:border-primary" />
                </label>
              ))}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={status === "sending"} className="rounded-full bg-background px-6 py-3 font-medium text-foreground disabled:opacity-60">
                {status === "sending" ? "Enviando…" : "Enviar"}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="container max-w-3xl pb-24">
        <h2 className="font-display text-2xl font-bold text-center">Veja o DAS em ação</h2>
        {VIDEOS.map((v) => (
          <div key={v.src} className="mt-8">
            <div className="overflow-hidden rounded-3xl border border-background/15 bg-background/5">
              <iframe
                src={v.src}
                title={v.title}
                loading="lazy"
                allowFullScreen
                scrolling="no"
                frameBorder={0}
                className="aspect-video w-full"
              />
            </div>
            {v.caption && <p className="mt-3 text-center text-sm text-background/60">{v.caption}</p>}
          </div>
        ))}
      </section>
    </InstitutionalLayout>
  );
}
