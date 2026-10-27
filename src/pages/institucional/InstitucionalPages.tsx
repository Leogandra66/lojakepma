import { InstitutionalLayout, INSTITUTIONAL_VIDEO_ID, useSeries, YouTube } from "./shared";

function Hero({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <section className="container py-16">
      <p className="text-sm uppercase tracking-[0.4em] text-primary">{kicker}</p>
      <h1 className="mt-2 max-w-3xl font-display text-5xl font-bold md:text-6xl">{title}</h1>
      <p className="mt-6 max-w-2xl text-lg text-background/70">{text}</p>
    </section>
  );
}

export function InstitucionalHistoria() {
  const { data = [] } = useSeries();
  const imgs = data.flatMap((s) => s.images).slice(0, 3);
  const steps = [
    ["2009", "Fundação em Changsha, Hunan, por Jack Peng e Kevin Liu, ex-engenheiros mecânicos."],
    ["Crescimento", "Investimento em automação de alta precisão para garantir consistência em larga escala."],
    ["Hoje", "Uma das marcas chinesas mais conceituadas do mundo — sem produzir para terceiros nem terceirizar."],
  ];
  return (
    <InstitutionalLayout title="História">
      <Hero kicker="Nossa história" title="De engenheiros a referência mundial" text="A Kepma nasceu da união entre engenharia e paixão pela música." />
      <section className="container grid gap-8 pb-16 md:grid-cols-3">
        {steps.map(([y, t]) => (
          <div key={y} className="border-t border-primary pt-6">
            <h3 className="font-display text-3xl font-bold">{y}</h3>
            <p className="mt-3 text-background/70">{t}</p>
          </div>
        ))}
      </section>
      <section className="container grid gap-4 pb-24 md:grid-cols-3">
        {imgs.map((s) => <img key={s} src={s} alt="Kepma" loading="lazy" className="aspect-[3/4] w-full rounded-2xl object-cover" />)}
      </section>
    </InstitutionalLayout>
  );
}

export function InstitucionalFabrica() {
  const { data = [] } = useSeries();
  const imgs = data.flatMap((s) => s.images).slice(3, 9);
  return (
    <InstitutionalLayout title="A Fábrica">
      <Hero kicker="A fábrica" title="Tecnologia de ponta, controle total" text="Cada etapa — da seleção da madeira ao acabamento — acontece dentro da própria Kepma." />
      <section className="container pb-16"><YouTube id={INSTITUTIONAL_VIDEO_ID} /></section>
      <section className="container grid grid-cols-2 gap-4 pb-24 md:grid-cols-3">
        {imgs.map((s) => <img key={s} src={s} alt="Produção Kepma" loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />)}
      </section>
    </InstitutionalLayout>
  );
}

export function InstitucionalArtistas() {
  return (
    <InstitutionalLayout title="Artistas">
      <Hero kicker="Artistas" title="Quem toca Kepma" text="Em breve, os artistas que levam a Kepma aos palcos do Brasil e do mundo." />
      <section className="container grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex aspect-[3/4] items-end rounded-3xl border border-dashed border-background/20 p-6 text-background/40">Artista em breve</div>
        ))}
      </section>
    </InstitutionalLayout>
  );
}
