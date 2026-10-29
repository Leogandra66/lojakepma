import { Link, useParams } from "react-router-dom";
import { InstitutionalLayout, useSeries } from "./shared";

type Spec = { label: string; value: string };

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

export default function InstitucionalSerie() {
  const { slug } = useParams();
  const { data = [], isLoading } = useSeries();
  const s = data.find((x) => x.slug === slug);

  const parsed = (s?.products ?? []).map((p) => ({ p, ...parseDescription(p.description) }));
  // Especificações comuns a todos os modelos = ficha da linha
  const common: Spec[] = parsed.length
    ? parsed[0].specs.filter((sp) => parsed.every((x) => x.specs.some((o) => o.label === sp.label && o.value === sp.value)))
    : [];
  const commonKeys = new Set(common.map((c) => `${c.label}|${c.value}`));
  const lineText = parsed.find((x) => x.text.length)?.text ?? [];
  const imgs = s?.images ?? [];
  const img = (i: number) => (imgs.length ? imgs[i % imgs.length] : null);

  return (
    <InstitutionalLayout title={s ? `Série ${s.name}` : "Série"}>
      <div className="container py-16">
        <Link to="/institucional#series" className="text-sm text-background/60 hover:text-background">← Todas as séries</Link>
        {isLoading ? <p className="mt-8 text-background/60">Carregando…</p> : !s ? <p className="mt-8">Série não encontrada.</p> : (
          <>
            <p className="mt-8 text-sm uppercase tracking-[0.4em] text-primary">Série</p>
            <h1 className="font-display text-5xl font-bold md:text-7xl">{s.name}</h1>
            <p className="mt-4 text-background/60">{s.products.length} modelo(s)</p>

            {img(0) && <img src={img(0)!} alt={s.name} className="mt-12 aspect-[16/9] w-full rounded-3xl object-cover" />}

            {(lineText.length > 0 || common.length > 0) && (
              <section className="mt-20 grid gap-12 md:grid-cols-2 md:items-center">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-primary">A linha</p>
                  <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Ficha técnica {s.name}</h2>
                  {lineText.map((t) => <p key={t} className="mt-4 text-background/70">{t}</p>)}
                  <dl className="mt-8 divide-y divide-background/10 border-y border-background/10">
                    {common.map((c) => (
                      <div key={c.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
                        <dt className="text-background/50">{c.label}</dt>
                        <dd className="text-background">{c.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {img(1) && <img src={img(1)!} alt={s.name} loading="lazy" className="aspect-[4/5] w-full rounded-3xl object-cover" />}
              </section>
            )}

            <h2 className="mt-24 mb-10 font-display text-3xl font-bold">Modelos</h2>
            <div className="space-y-20">
              {parsed.map(({ p, specs }, i) => {
                const own = specs.filter((sp) => !commonKeys.has(`${sp.label}|${sp.value}`));
                const photo = p.image_url ?? img(i + 2);
                return (
                  <article key={p.id} className="grid gap-10 md:grid-cols-2 md:items-center">
                    {photo && <img src={photo} alt={p.name} loading="lazy" className={`aspect-square w-full rounded-3xl object-cover ${i % 2 ? "md:order-2" : ""}`} />}
                    <div>
                      <h3 className="font-display text-2xl font-bold md:text-3xl">{p.name}</h3>
                      {own.length > 0 ? (
                        <dl className="mt-6 divide-y divide-background/10 border-y border-background/10">
                          {own.map((c) => (
                            <div key={c.label + c.value} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
                              <dt className="text-background/50">{c.label}</dt>
                              <dd>{c.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-4 text-background/60">Segue a ficha técnica da linha {s.name}.</p>
                      )}
                      <Link to={`/produto/${p.id}`} className="mt-6 inline-block text-sm text-primary">Ver na loja →</Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {imgs.length > 3 && (
              <div className="mt-24 columns-1 gap-4 sm:columns-2 lg:columns-3">
                {imgs.slice(2).map((src) => (
                  <img key={src} src={src} alt={s.name} loading="lazy" className="mb-4 w-full break-inside-avoid rounded-2xl" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </InstitutionalLayout>
  );
}
