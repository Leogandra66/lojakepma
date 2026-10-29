import { Link } from "react-router-dom";
import { InstitutionalLayout, useSeries } from "./shared";
import launchVideo from "@/assets/kepma-a1-das-lancamento.mp4.asset.json";

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

      {galleryImgs.length > 0 && (
        <section className="container pb-20">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-background/5">
            {galleryImgs.map((src, i) => (
              <img key={src} src={src} alt="Violão Kepma" loading="lazy" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === slide ? "opacity-100" : "opacity-0"}`} />
            ))}
            <button type="button" aria-label="Foto anterior" onClick={() => go(-1)} className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/60 text-background backdrop-blur transition hover:bg-foreground/80"><ChevronLeft /></button>
            <button type="button" aria-label="Próxima foto" onClick={() => go(1)} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/60 text-background backdrop-blur transition hover:bg-foreground/80"><ChevronRight /></button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {galleryImgs.map((src, i) => (
                <button key={src} type="button" aria-label={`Ir para foto ${i + 1}`} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-background" : "w-2 bg-background/50"}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container pb-20">
        <p className="mb-2 text-sm uppercase tracking-[0.4em] text-primary">Kepma A1 DAS</p>
        <h2 className="mb-8 font-display text-3xl font-bold md:text-4xl">Lançamento Mundial</h2>
        <video src={launchVideo.url} controls playsInline preload="metadata" className="aspect-video w-full rounded-3xl bg-background/5 object-cover" />
      </section>


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
