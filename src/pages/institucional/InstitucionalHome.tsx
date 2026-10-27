import { Link } from "react-router-dom";
import { InstitutionalLayout, INSTITUTIONAL_VIDEO_ID, useSeries, YouTube } from "./shared";

export default function InstitucionalHome() {
  const { data: series = [], isLoading } = useSeries();
  const heroImgs = series.flatMap((s) => s.images).slice(0, 6);
  return (
    <InstitutionalLayout title="Kepma Brasil">
      <section className="relative flex min-h-[85vh] items-center overflow-hidden">
        {heroImgs[0] && <img src={heroImgs[0]} alt="Violão Kepma" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
        <div className="container relative">
          <p className="mb-4 text-sm uppercase tracking-[0.4em] text-primary">Desde 2009</p>
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight md:text-7xl">Precisão de engenharia. Alma de violão.</h1>
          <p className="mt-6 max-w-xl text-lg text-background/70">Uma das fábricas de violões mais avançadas do mundo — cada instrumento feito inteiramente pela Kepma.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#series" className="rounded-full bg-background px-6 py-3 font-medium text-foreground">Conheça as séries</a>
            <Link to="/institucional/fabrica" className="rounded-full border border-background/30 px-6 py-3 font-medium">A fábrica</Link>
          </div>
        </div>
      </section>

      <section className="container py-20">
        <h2 className="mb-8 font-display text-3xl font-bold md:text-4xl">Kepma em movimento</h2>
        <YouTube id={INSTITUTIONAL_VIDEO_ID} />
      </section>

      {heroImgs.length > 1 && (
        <section className="container grid grid-cols-2 gap-3 pb-20 md:grid-cols-3">
          {heroImgs.slice(1).map((src, i) => (
            <img key={src} src={src} alt="Violão Kepma" loading="lazy" className={`h-full w-full rounded-2xl object-cover ${i === 0 ? "md:col-span-2 md:row-span-2" : "aspect-square"}`} />
          ))}
        </section>
      )}

      <section id="series" className="container py-20">
        <h2 className="mb-2 font-display text-3xl font-bold md:text-4xl">As séries</h2>
        <p className="mb-10 text-background/60">Escolha uma série para ver mais fotos e detalhes.</p>
        {isLoading ? <p className="text-background/60">Carregando…</p> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {series.map((s) => (
              <Link key={s.slug} to={`/institucional/series/${s.slug}`} className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-background/5">
                {s.cover && <img src={s.cover} alt={s.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-background/60">Série</p>
                  <h3 className="font-display text-3xl font-bold">{s.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container grid gap-6 pb-24 md:grid-cols-3">
        {[["História", "Como dois engenheiros criaram uma referência mundial.", "/institucional/historia"], ["Fábrica", "Automação e cuidado artesanal em Changsha.", "/institucional/fabrica"], ["Artistas", "Quem toca Kepma.", "/institucional/artistas"]].map(([t, d, to]) => (
          <Link key={to} to={to} className="rounded-3xl border border-background/10 p-8 transition-colors hover:bg-background/5">
            <h3 className="font-display text-2xl font-bold">{t} →</h3>
            <p className="mt-2 text-background/60">{d}</p>
          </Link>
        ))}
      </section>
    </InstitutionalLayout>
  );
}
