import { Link, useParams } from "react-router-dom";
import { InstitutionalLayout, useSeries } from "./shared";

export default function InstitucionalSerie() {
  const { slug } = useParams();
  const { data = [], isLoading } = useSeries();
  const s = data.find((x) => x.slug === slug);
  return (
    <InstitutionalLayout title={s ? `Série ${s.name}` : "Série"}>
      <div className="container py-16">
        <Link to="/institucional#series" className="text-sm text-background/60 hover:text-background">← Todas as séries</Link>
        {isLoading ? <p className="mt-8 text-background/60">Carregando…</p> : !s ? <p className="mt-8">Série não encontrada.</p> : (
          <>
            <p className="mt-8 text-sm uppercase tracking-[0.4em] text-primary">Série</p>
            <h1 className="font-display text-5xl font-bold md:text-7xl">{s.name}</h1>
            <p className="mt-4 text-background/60">{s.products.length} modelo(s)</p>
            <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
              {s.images.map((src) => (
                <img key={src} src={src} alt={s.name} loading="lazy" className="mb-4 w-full break-inside-avoid rounded-2xl" />
              ))}
            </div>
            <h2 className="mt-16 mb-6 font-display text-3xl font-bold">Modelos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.products.map((p) => (
                <Link key={p.id} to={`/produto/${p.id}`} className="rounded-2xl border border-background/10 p-6 hover:bg-background/5">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-background/60">{p.description}</p>
                  <span className="mt-4 inline-block text-sm text-primary">Ver na loja →</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </InstitutionalLayout>
  );
}
