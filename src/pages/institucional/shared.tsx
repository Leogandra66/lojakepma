import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReactNode, useEffect } from "react";
import kepmaLogo from "@/assets/kepma-logo.png.asset.json";

export const INSTITUTIONAL_VIDEO_ID = "TABwoa5Gdh8";
export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type SeriesItem = { name: string; slug: string; cover: string | null; images: string[]; products: { id: string; name: string; description: string | null; image_url: string | null }[] };

export function useSeries() {
  return useQuery({
    queryKey: ["institutional-series"],
    queryFn: async (): Promise<SeriesItem[]> => {
      // Institucional: todos os modelos da linha (inclusive sem estoque/fora da loja)
      const { data: rows, error } = await supabase.rpc("get_institutional_series");
      if (error) throw error;
      const map = new Map<string, SeriesItem & { perProduct: string[][] }>();
      for (const p of rows ?? []) {
        const name = p.category || "Outros";
        if (!map.has(name)) map.set(name, { name, slug: slugify(name), cover: null, images: [], products: [], perProduct: [] });
        const s = map.get(name)!;
        s.products.push({ id: p.id, name: p.name, description: p.description, image_url: p.image_url });
        s.cover ??= p.image_url;
        s.perProduct.push([p.image_url, ...(p.images ?? [])].filter(Boolean) as string[]);
      }
      // Mistura as fotos intercalando os modelos da linha
      return [...map.values()].map(({ perProduct, ...s }) => {
        const mixed: string[] = [];
        const max = Math.max(0, ...perProduct.map((l) => l.length));
        for (let i = 0; i < max; i++) for (const l of perProduct) if (l[i]) mixed.push(l[i]);
        return { ...s, images: [...new Set(mixed)] };
      });
    },
  });
}

const links = [
  { to: "/institucional", label: "Início", end: true },
  { to: "/institucional/historia", label: "História" },
  { to: "/institucional/fabrica", label: "Fábrica" },
  { to: "/institucional/artistas", label: "Artistas" },
];

export function InstitutionalLayout({ children, title }: { children: ReactNode; title: string }) {
  useEffect(() => { document.title = `${title} | Kepma Brasil`; window.scrollTo(0, 0); }, [title]);
  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-background/10 bg-foreground/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/institucional" aria-label="Kepma Brasil — Início" className="flex shrink-0 items-center">
            <img src={kepmaLogo.url} alt="Kepma" className="h-9 w-auto md:h-10" />
          </Link>
          <nav className="hidden gap-8 text-sm md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => isActive ? "text-background" : "text-background/60 hover:text-background transition-colors"}>{l.label}</NavLink>
            ))}
          </nav>
          <Link to="/" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Ir para a loja</Link>
        </div>
        <nav className="container flex gap-5 overflow-x-auto pb-3 text-sm md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => isActive ? "text-background" : "text-background/60"}>{l.label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="pt-24 md:pt-16">{children}</main>
      <footer className="border-t border-background/10 py-10 text-center text-sm text-background/50">
        © {new Date().getFullYear()} Kepma Brasil · <Link to="/" className="underline">Loja oficial</Link>
      </footer>
    </div>
  );
}

export function YouTube({ id }: { id: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-background/5">
      <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${id}?rel=0`} title="Vídeo institucional Kepma" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
    </div>
  );
}
