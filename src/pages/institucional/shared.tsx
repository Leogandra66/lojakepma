import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReactNode, useEffect } from "react";

export const INSTITUTIONAL_VIDEO_ID = "TABwoa5Gdh8";
export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type SeriesItem = { name: string; slug: string; cover: string | null; images: string[]; products: { id: string; name: string; description: string | null; image_url: string | null }[] };

export function useSeries() {
  return useQuery({
    queryKey: ["institutional-series"],
    queryFn: async (): Promise<SeriesItem[]> => {
      const { data: products, error } = await supabase
        .from("products")
        .select("id,name,description,image_url,category")
        .eq("active", true)
        .neq("category", "Eletrônica")
        .order("name");
      if (error) throw error;
      const ids = (products ?? []).map((p) => p.id);
      const { data: imgs } = ids.length
        ? await supabase.from("product_images").select("product_id,image_url,position").in("product_id", ids).order("position")
        : { data: [] as { product_id: string; image_url: string }[] };
      const map = new Map<string, SeriesItem>();
      for (const p of products ?? []) {
        const name = p.category || "Outros";
        if (!map.has(name)) map.set(name, { name, slug: slugify(name), cover: null, images: [], products: [] });
        const s = map.get(name)!;
        s.products.push(p);
        if (p.image_url) { s.images.push(p.image_url); s.cover ??= p.image_url; }
        for (const i of (imgs ?? []).filter((i) => i.product_id === p.id)) s.images.push(i.image_url);
      }
      return [...map.values()].map((s) => ({ ...s, images: [...new Set(s.images)] }));
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
          <Link to="/institucional" className="font-display text-xl font-bold tracking-[0.3em]">KEPMA</Link>
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
