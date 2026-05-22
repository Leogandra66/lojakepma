import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const CATEGORIES = ["B1", "A1", "G1", "F1", "F0 Pro", "F0B Fênix", "EC Plus", "FC Mini", "Eletrônica"];
const PAGE_SIZE = 12;

export default function Index() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("status", { ascending: true })
        .order("name")
        .eq("active", true);
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (selectedCategory) {
      list = list.filter((p) => p.category === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category?.toLowerCase().includes(q) ?? false) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      );
    }
    const min = parseFloat(minPrice.replace(/[^0-9.]/g, ""));
    const max = parseFloat(maxPrice.replace(/[^0-9.]/g, ""));
    if (!isNaN(min) && min > 0) {
      list = list.filter((p) => p.price >= min);
    }
    if (!isNaN(max) && max > 0) {
      list = list.filter((p) => p.price <= max);
    }
    return list;
  }, [products, selectedCategory, searchQuery, minPrice, maxPrice]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length ?? 0) / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, minPrice, maxPrice]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (safePage > 3) pages.push("ellipsis");
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <Header />

      <main id="produtos" className="flex-1">
        {/* Page header — Apple "Comprar iPhone" style */}
        <section className="container pt-16 pb-10 sm:pt-24 sm:pb-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground">
              Comprar Kepma.
            </h1>
            <div className="flex flex-col gap-1 text-sm sm:text-right">
              <a
                href="https://wa.me/553125280368"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Falar com um especialista ↗
              </a>
              <Link to="/conheca-a-fabrica" className="text-primary hover:underline">
                Conheça a fábrica ↗
              </Link>
            </div>
          </div>
        </section>

        {/* Sub-nav: filter tabs (text style, like Apple's "Todos os modelos / Guias / ...") */}
        <section className="border-y border-border bg-background/60 backdrop-blur-sm sticky top-16 z-30">
          <div className="container">
            <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos os modelos
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="container py-10 sm:py-14">
          {/* Search + Price filter */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar modelos..."
                className="pl-10 pr-10 h-11 rounded-full border-border bg-background"
                aria-label="Pesquisar produtos"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </br></div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="min-price" className="text-xs font-medium text-muted-foreground">Preço mín.</label>
                <Input
                  id="min-price"
                  type="text"
                  inputMode="decimal"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="R$ 0,00"
                  className="h-10 w-36 rounded-full border-border bg-background text-sm"
                />
              </div>
              <span className="mt-5 text-muted-foreground">—</span>
              <div className="flex flex-col gap-1">
                <label htmlFor="max-price" className="text-xs font-medium text-muted-foreground">Preço máx.</label>
                <Input
                  id="max-price"
                  type="text"
                  inputMode="decimal"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="R$ 0,00"
                  className="h-10 w-36 rounded-full border-border bg-background text-sm"
                />
              </div>
              {(minPrice || maxPrice) && (
                <button
                  type="button"
                  onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                  className="mt-5 rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Limpar filtro de preço"
                  title="Limpar filtro de preço"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Section title */}
          <div className="mb-6 flex items-baseline gap-3">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {selectedCategory ? `Série ${selectedCategory}.` : "Todos os modelos."}
            </h2>
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-muted-foreground">
              Escolha o seu.
            </span>
          </div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-3xl bg-card p-8">
                  <Skeleton className="h-5 w-1/3 mb-4" />
                  <Skeleton className="aspect-square w-full mb-4" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-heading text-2xl text-muted-foreground">
                {selectedCategory ? `Nenhum produto na categoria "${selectedCategory}"` : "Nenhum produto cadastrado ainda"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedCategory ? "Tente outra categoria." : "Os produtos aparecerão aqui quando forem adicionados."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginated?.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-12">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#produtos"
                        onClick={(e) => {
                          e.preventDefault();
                          if (safePage > 1) goToPage(safePage - 1);
                        }}
                        className={safePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {getPageNumbers().map((page, idx) =>
                      page === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#produtos"
                            isActive={page === safePage}
                            onClick={(e) => {
                              e.preventDefault();
                              goToPage(page);
                            }}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#produtos"
                        onClick={(e) => {
                          e.preventDefault();
                          if (safePage < totalPages) goToPage(safePage + 1);
                        }}
                        className={safePage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
