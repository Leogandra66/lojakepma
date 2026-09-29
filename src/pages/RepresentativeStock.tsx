import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, PackageSearch, RefreshCw, Search, X } from "lucide-react";
import writeXlsxFile from "write-excel-file/browser";
import kepmaLogo from "@/assets/kepma-logo.webp";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type StockProduct = {
  id: string;
  name: string;
  bling_code: string | null;
  description: string | null;
  stock_quantity: number;
  image_url: string | null;
};

type ProductImage = {
  product_id: string;
  image_url: string;
  position: number;
};

type StockRow = StockProduct & { imageUrls: string[] };

const PAGE_PATH = "/estoque/representantes/kepma-posicao-7f3c9a82-2026";
const SITE_URL = "https://loja.kepmabrasil.com.br";

function absoluteImageUrl(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url, SITE_URL).toString();
  } catch {
    return url;
  }
}

function isElectronicsCategory(category: string | null) {
  return category?.trim().localeCompare("Eletrônica", "pt-BR", { sensitivity: "base" }) === 0;
}

function todayStamp() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("/")
    .reverse()
    .join("-");
}

function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export default function RepresentativeStock() {
  const [products, setProducts] = useState<StockRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadProducts() {
    setLoading(true);
    setError(null);

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, name, bling_code, description, stock_quantity, image_url, category")
      .eq("active", true)
      .order("name", { ascending: true });

    if (productError) {
      setError("Não foi possível carregar a posição de estoque. Tente novamente.");
      setLoading(false);
      return;
    }

    const visibleProducts = (productData ?? []).filter(
      (product) => !isElectronicsCategory(product.category),
    );
    const productIds = visibleProducts.map((product) => product.id);
    let imageData: ProductImage[] = [];

    if (productIds.length > 0) {
      const { data, error: imageError } = await supabase
        .from("product_images")
        .select("product_id, image_url, position")
        .in("product_id", productIds)
        .order("position", { ascending: true });

      if (imageError) {
        setError("Os produtos foram encontrados, mas não foi possível carregar suas imagens.");
        setLoading(false);
        return;
      }
      imageData = data ?? [];
    }

    const imagesByProduct = new Map<string, string[]>();
    imageData.forEach((image) => {
      const absoluteUrl = absoluteImageUrl(image.image_url);
      if (!absoluteUrl) return;
      const current = imagesByProduct.get(image.product_id) ?? [];
      if (!current.includes(absoluteUrl)) current.push(absoluteUrl);
      imagesByProduct.set(image.product_id, current);
    });

    const rows = visibleProducts.map(({ category: _category, ...product }) => {
      const imageUrls = imagesByProduct.get(product.id) ?? [];
      const mainImage = absoluteImageUrl(product.image_url);
      if (mainImage && !imageUrls.includes(mainImage)) imageUrls.unshift(mainImage);
      return { ...product, imageUrls };
    });

    setProducts(rows);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    const previousTitle = document.title;
    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobots = robotsMeta?.content;

    document.title = "Posição de estoque | Kepma Brasil";
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.name = "robots";
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = "noindex, nofollow, noarchive";
    void loadProducts();

    return () => {
      document.title = previousTitle;
      if (!robotsMeta) return;
      if (previousRobots === undefined) robotsMeta.remove();
      else robotsMeta.content = previousRobots;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedQuery) return products;
    return products.filter(
      (product) =>
        product.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ||
        product.bling_code?.toLocaleLowerCase("pt-BR").includes(normalizedQuery),
    );
  }, [products, query]);

  async function exportToExcel() {
    const maximumImages = filteredProducts.reduce(
      (maximum, product) => Math.max(maximum, product.imageUrls.length),
      0,
    );
    const headerStyle = {
      fontFamily: "Arial",
      fontWeight: "bold" as const,
      color: "#FFFFFF",
      backgroundColor: "#26221F",
    };
    const rows = [
      [
        "Código do produto",
        "Nome do produto",
        "Descrição",
        "Quantidade em estoque",
        ...Array.from({ length: maximumImages }, (_, index) => `Imagem ${index + 1}`),
      ].map((value) => ({ value, ...headerStyle })),
      ...filteredProducts.map((product) => [
        { value: safeSpreadsheetText(product.bling_code ?? ""), fontFamily: "Arial" },
        { value: safeSpreadsheetText(product.name), fontFamily: "Arial", wrap: true },
        { value: safeSpreadsheetText(product.description ?? ""), fontFamily: "Arial", wrap: true },
        { value: product.stock_quantity, type: Number, fontFamily: "Arial" },
        ...Array.from({ length: maximumImages }, (_, index) => ({
          value: safeSpreadsheetText(product.imageUrls[index] ?? ""),
          fontFamily: "Arial",
          wrap: true,
        })),
      ]),
    ];
    await writeXlsxFile(rows, {
      columns: [
        { width: 20 },
        { width: 42 },
        { width: 70 },
        { width: 23 },
        ...Array.from({ length: maximumImages }, () => ({ width: 55 })),
      ],
      fileName: `estoque-kepma-${todayStamp()}.xlsx`,
      sheet: "Produtos",
      stickyRowsCount: 1,
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-foreground text-background">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-4 py-5 sm:px-8">
          <img src={kepmaLogo} alt="Kepma" className="h-8 w-auto brightness-0 invert" />
          <p className="text-right text-xs font-medium uppercase tracking-widest text-background/70">
            Uso comercial
          </p>
        </div>
      </header>

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-8 sm:py-14">
          <p className="mb-3 text-sm font-semibold text-primary">Catálogo Kepma Brasil</p>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold sm:text-5xl">Posição de estoque</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Produtos ativos disponíveis para consulta comercial. As quantidades acompanham a última sincronização do estoque.
              </p>
            </div>
            <Button
              size="lg"
              onClick={exportToExcel}
              disabled={loading || filteredProducts.length === 0}
              className="w-full sm:w-auto"
            >
              <Download aria-hidden="true" />
              Exportar para Excel
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por produto ou código"
              aria-label="Buscar por produto ou código"
              className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-10 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 md:justify-end">
            <p className="text-sm text-muted-foreground">
              <strong className="font-semibold text-foreground">{filteredProducts.length}</strong>{" "}
              {filteredProducts.length === 1 ? "produto" : "produtos"}
            </p>
            <Button variant="outline" size="sm" onClick={loadProducts} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
              Atualizar
            </Button>
          </div>
        </div>

        {lastUpdated && !loading && (
          <p className="mb-4 text-xs text-muted-foreground">
            Consulta atualizada em {lastUpdated.toLocaleString("pt-BR")}
          </p>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Carregando produtos
          </div>
        ) : error ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
            <PackageSearch className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={loadProducts}>Tentar novamente</Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
            <PackageSearch className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground">Tente buscar por outro nome ou código.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto border border-border md:block">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-[28%] px-4 py-3 font-semibold">Produto</th>
                    <th className="w-[14%] px-4 py-3 font-semibold">Código</th>
                    <th className="w-[31%] px-4 py-3 font-semibold">Descrição</th>
                    <th className="w-[9%] px-4 py-3 text-right font-semibold">Estoque</th>
                    <th className="w-[18%] px-4 py-3 font-semibold">Imagens</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t border-border align-top hover:bg-muted/40">
                      <td className="px-4 py-4 font-semibold">{product.name}</td>
                      <td className="px-4 py-4 font-mono text-xs">{product.bling_code || "—"}</td>
                      <td className="px-4 py-4 leading-6 text-muted-foreground">{product.description || "—"}</td>
                      <td className="px-4 py-4 text-right text-lg font-semibold tabular-nums">{product.stock_quantity}</td>
                      <td className="px-4 py-4">
                        {product.imageUrls.length > 0 ? (
                          <div className="space-y-2">
                            {product.imageUrls.map((url, index) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block break-all text-xs text-primary underline-offset-4 hover:underline"
                              >
                                {url}
                              </a>
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border border-y border-border md:hidden">
              {filteredProducts.map((product) => (
                <article key={product.id} className="py-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{product.name}</h2>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">Código: {product.bling_code || "—"}</p>
                    </div>
                    <div className="shrink-0 border-l border-border pl-4 text-right">
                      <p className="text-2xl font-semibold tabular-nums">{product.stock_quantity}</p>
                      <p className="text-xs text-muted-foreground">em estoque</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{product.description || "Sem descrição cadastrada."}</p>
                  {product.imageUrls.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                      {product.imageUrls.map((url, index) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Imagem {index + 1}: {url}
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-8">
        Kepma Brasil · Consulta comercial compartilhada
      </footer>
    </main>
  );
}

export { PAGE_PATH };