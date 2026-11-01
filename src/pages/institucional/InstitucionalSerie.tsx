import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { InstitutionalLayout, useSeries } from "./shared";

type Spec = { label: string; value: string };

// Só exibe fotos com resolução suficiente para uma boa apresentação
const MIN_SIDE = 900;

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
        im.onload = () => res(Math.min(im.naturalWidth, im.naturalHeight) >= MIN_SIDE ? src : null);
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
    <div>
      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-background/5">
        <button onClick={() => setZoom(true)} className="h-full w-full cursor-zoom-in" aria-label="Ampliar imagem">
          <img src={images[i]} alt={name} className="h-full w-full object-contain p-6" />
        </button>
        <ZoomIn className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-background/50" />
        {n > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-foreground/60 p-2 text-background opacity-0 transition group-hover:opacity-100"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => go(1)} aria-label="Próxima" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-foreground/60 p-2 text-background opacity-0 transition group-hover:opacity-100"><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, idx) => (
            <button key={src} onClick={() => setI(idx)} aria-label={`Foto ${idx + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background/5 transition ${idx === i ? "ring-2 ring-primary" : "opacity-50 hover:opacity-100"}`}>
              <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/95 p-4" onClick={() => setZoom(false)}>
          <button aria-label="Fechar" className="absolute right-5 top-5 text-background/70 hover:text-background"><X className="h-7 w-7" /></button>
          {n > 1 && <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Anterior" className="absolute left-4 text-background/70 hover:text-background"><ChevronLeft className="h-10 w-10" /></button>}
          <img src={images[i]} alt={name} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[92vw] object-contain" />
          {n > 1 && <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Próxima" className="absolute right-4 text-background/70 hover:text-background"><ChevronRight className="h-10 w-10" /></button>}
        </div>
      )}
    </div>
  );
}

export default function InstitucionalSerie() {
  const { slug } = useParams();
  const { data = [], isLoading } = useSeries();
  const s = data.find((x) => x.slug === slug);

  const parsed = (s?.products ?? []).map((p) => ({ p, ...parseDescription(p.description) }));
  const common: Spec[] = parsed.length
    ? parsed[0].specs.filter((sp) => parsed.every((x) => x.specs.some((o) => o.label === sp.label && o.value === sp.value)))
    : [];
  const lineText = parsed.find((x) => x.text.length)?.text ?? [];
  const good = useQualityImages(s?.images ?? []);

  return (
    <InstitutionalLayout title={s ? `Série ${s.name}` : "Série"}>
      <div className="container max-w-6xl py-16">
        <Link to="/institucional#series" className="text-sm text-background/60 hover:text-background">← Todas as séries</Link>
        {isLoading ? <p className="mt-8 text-background/60">Carregando…</p> : !s ? <p className="mt-8">Série não encontrada.</p> : (
          <section className="mt-10 grid gap-12 md:grid-cols-2 md:items-start">
            <div className="md:sticky md:top-24">
              {good === null ? <div className="aspect-square w-full animate-pulse rounded-2xl bg-background/5" /> : <Gallery images={good} name={s.name} />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-primary">Série</p>
              <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{s.name}</h1>
              {lineText.map((t) => <p key={t} className="mt-4 text-background/70">{t}</p>)}
              {common.length > 0 && (
                <>
                  <h2 className="mt-10 text-xs uppercase tracking-[0.3em] text-background/50">Ficha técnica</h2>
                  <dl className="mt-3 divide-y divide-background/10 border-y border-background/10">
                    {common.map((c) => (
                      <div key={c.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
                        <dt className="text-background/50">{c.label}</dt>
                        <dd>{c.value}</dd>
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
