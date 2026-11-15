import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstitutionalLayout, useSeries } from "./shared";
import { CURATED_URLS, SERIES_BODY_SHAPES } from "./seriesAccessories";
import { applyNeckJointNote, SERIES_DESCRIPTIONS, SERIES_TEXTS, type Spec } from "./seriesTexts";

// Só exibe fotos com resolução suficiente para uma boa apresentação
const MIN_SIDE = 900;
// Imagens curadas localmente (ex.: case TKL) são sempre aceitas
const CURATED_IMAGES = CURATED_URLS;

function parseDescription(desc: string | null) {
  const specs: Spec[] = [];
  const text: string[] = [];
  for (const raw of (desc ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:：]{1,40})[:：]\s*(.+)$/);
    if (m) specs.push({ label: m[1].trim(), value: m[2].trim() });
    else text.push(line);
  }
  return { specs, text };
}

function useQualityImages(urls: string[]) {
  const [ok, setOk] = useState<string[] | null>(null);
  const key = urls.join("|");
  useEffect(() => {
    let alive = true;
    setOk(null);
    Promise.all(
      urls.map((src) => new Promise<string | null>((res) => {
        const im = new Image();
        im.onload = () => res(CURATED_IMAGES.has(src) || Math.min(im.naturalWidth, im.naturalHeight) >= MIN_SIDE ? src : null);
        im.onerror = () => res(null);
        im.src = src;
      })),
    ).then((r) => alive && setOk(r.filter(Boolean) as string[]));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ok;
}

function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const n = images.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    if (!zoom) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!n) return <p className="text-sm text-background/50">Fotos em breve.</p>;

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="group relative aspect-square w-full overflow-hidden rounded-lg bg-background/5">
        <Button variant="ghost" onClick={() => setZoom(true)} className="h-full w-full cursor-zoom-in p-0 hover:bg-transparent" aria-label="Ampliar imagem">
          <img src={images[i]} alt={name} className="h-full w-full min-w-0 object-contain p-3 sm:p-6" />
        </Button>
        <ZoomIn className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-background/50" />
        {n > 1 && (
          <>
            <Button variant="ghost" size="icon" onClick={() => go(-1)} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 md:opacity-0 md:group-hover:opacity-100"><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="Próxima" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 md:opacity-0 md:group-hover:opacity-100"><ChevronRight /></Button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain px-1 py-1">
          {images.map((src, idx) => (
            <Button variant="ghost" key={src} onClick={() => setI(idx)} aria-label={`Foto ${idx + 1}`} aria-pressed={idx === i}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-background/5 p-0 hover:bg-background/10 sm:h-16 sm:w-16 ${idx === i ? "ring-2 ring-primary" : "opacity-50 hover:opacity-100"}`}>
              <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
            </Button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/95 p-4" onClick={() => setZoom(false)}>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setZoom(false)} className="absolute right-3 top-3 text-background/70 hover:bg-background/10 hover:text-background"><X /></Button>
          {n > 1 && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Anterior" className="absolute left-2 z-10 bg-foreground/60 text-background/70 hover:bg-background/10 hover:text-background"><ChevronLeft /></Button>}
          <img src={images[i]} alt={name} onClick={(e) => e.stopPropagation()} className="max-h-[calc(100dvh-5rem)] max-w-full object-contain" />
          {n > 1 && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Próxima" className="absolute right-2 z-10 bg-foreground/60 text-background/70 hover:bg-background/10 hover:text-background"><ChevronRight /></Button>}
        </div>
      )}
    </div>
  );
}

export default function InstitucionalSerie() {
  const { slug } = useParams();
  const { data = [], isLoading } = useSeries();
  const s = data.find((x) => x.slug === slug);

  // Descrição curada da série (institucional apenas) substitui a descrição do catálogo
  const curatedDescription = s ? SERIES_DESCRIPTIONS[s.name] : undefined;
  const parsed = (
    curatedDescription
      ? [curatedDescription]
      : (s?.products ?? []).map((p) => p.description ?? "")
  ).map((d) => parseDescription(d));
  const baseCommon: Spec[] = parsed.length
    ? parsed[0].specs.filter((sp) => parsed.every((x) => x.specs.some((o) => o.label === sp.label && o.value === sp.value)))
    : [];
  const shapes = s ? SERIES_BODY_SHAPES[s.name] : undefined;
  const common: Spec[] = applyNeckJointNote(shapes
    ? [{ label: "Shapes de corpo", value: shapes }, ...baseCommon.filter((c) => !/shape|formato do corpo|corpo$/i.test(c.label))]
    : baseCommon);
  const lineText = parsed.find((x) => x.text.length)?.text ?? [];
  const curatedText = s ? SERIES_TEXTS[s.name] : undefined;
  const good = useQualityImages(s?.images ?? []);

  return (
    <InstitutionalLayout title={s ? `Série ${s.name}` : "Série"}>
      <div className="container w-full min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <Link to="/institucional#series" className="text-sm text-background/60 hover:text-background">← Todas as séries</Link>
        {isLoading ? <p className="mt-8 text-background/60">Carregando…</p> : !s ? <p className="mt-8">Série não encontrada.</p> : (
          <section className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 md:mt-10 md:grid-cols-2 md:items-start md:gap-12">
            <div className="w-full min-w-0 max-w-full md:sticky md:top-24">
              {good === null ? <div className="aspect-square w-full animate-pulse rounded-lg bg-background/5" /> : <Gallery images={good} name={s.name} />}
            </div>
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <p className="text-xs uppercase tracking-[0.4em] text-primary">Série</p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl md:text-5xl">{s.name}</h1>
              {curatedText ? curatedText.map((b, i) => (
                <div key={`${b.heading ?? "p"}-${i}`}>
                  {b.heading && <h2 className="mt-8 font-display text-lg font-semibold text-background">{b.heading}</h2>}
                  <p className="mt-3 text-background/70">{b.body}</p>
                </div>
              )) : lineText.map((t) => <p key={t} className="mt-4 text-background/70">{t}</p>)}
              {common.length > 0 && (
                <>
                  <h2 className="mt-10 text-xs uppercase tracking-[0.3em] text-background/50">Ficha técnica</h2>
                  <dl className="mt-3 divide-y divide-background/10 border-y border-background/10">
                    {common.map((c) => (
                      <div key={c.label} className="grid min-w-0 grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                        <dt className="min-w-0 text-background/50">{c.label}</dt>
                        <dd className="min-w-0">{c.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </InstitutionalLayout>
  );
}
