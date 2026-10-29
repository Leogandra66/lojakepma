import { Link } from "react-router-dom";
import { InstitutionalLayout, useSeries } from "./shared";
import launchVideo from "@/assets/kepma-a1-das-lancamento.mp4.asset.json";
import { SERIES_CARDS, orderInstitutionalSeries } from "./seriesCards";

export default function InstitucionalHome() {
  const { data: series = [], isLoading } = useSeries();
  const cardSeries = orderInstitutionalSeries(series);
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

      <section id="series" className="container py-16">
        <h2 className="mb-2 font-display text-3xl font-bold md:text-4xl">As séries</h2>
        <p className="mb-8 text-background/60">Escolha uma série para ver mais fotos e detalhes.</p>
        {isLoading ? <p className="text-background/60">Carregando…</p> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cardSeries.map((s) => (
              <Link key={s.slug} to={`/institucional/series/${s.slug}`} className="group relative aspect-square overflow-hidden rounded-lg border border-background/10 bg-foreground">
                <div className="absolute inset-x-0 top-3 bottom-16 flex items-center justify-center">
                  <img src={SERIES_CARDS.find(card => card.name === s.name)?.cover ?? s.cover ?? undefined} alt={s.name} loading="lazy" className="h-full w-full object-contain px-4 transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                </div>
                <div className="absolute bottom-4 inset-x-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-background/60">Série</p>
                  <h3 className="font-display text-xl font-bold md:text-2xl">{s.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container pb-20">
        <p className="mb-2 text-sm uppercase tracking-[0.4em] text-primary">Kepma A1 DAS</p>
        <h2 className="mb-8 font-display text-3xl font-bold md:text-4xl">Lançamento Mundial</h2>
        <video src={launchVideo.url} controls playsInline preload="metadata" className="aspect-video w-full rounded-3xl bg-background/5 object-cover" />
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <h3 className="font-display text-xl font-bold md:text-2xl">O sistema DAS</h3>
          <p className="mt-3 text-background/70">
            Presente na linha A1 DAS, o Dual Adjustment System permite ajustar o ângulo do braço e a altura das cordas
            com precisão, sem forçar o braço do violão. São 8 níveis de regulagem — de 1,3 mm a 3,5 mm — feitos com uma
            única chave universal, que também ajusta a curvatura do braço. Mais conforto para tocar, do seu jeito.
          </p>
        </div>
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
