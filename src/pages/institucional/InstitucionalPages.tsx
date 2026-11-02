import { InstitutionalLayout, useSeries, YouTube } from "./shared";

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
  return (
    <InstitutionalLayout title="História">
      <Hero kicker="Nossa história" title="De engenheiros a referência mundial" text="A Kepma nasceu da união entre engenharia e paixão pela música." />
      <section className="container pb-24">
        <YouTube id="IYIWk4QUlbc" />
      </section>
    </InstitutionalLayout>
  );
}

export function InstitucionalFabrica() {
  const videos = ["l1AfcPzCqik", "JCjSxSSqRqs"];
  return (
    <InstitutionalLayout title="A Fábrica">
      <Hero kicker="A fábrica" title="Tecnologia de ponta, controle total" text="Cada etapa — da seleção da madeira ao acabamento — acontece dentro da própria Kepma." />
      <section className="container grid gap-8 pb-24 lg:grid-cols-2">
        {videos.map((id) => (
          <div key={id}>
            <YouTube id={id} />
          </div>
        ))}
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
