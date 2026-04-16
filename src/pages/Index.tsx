import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroBanner from "@/components/HeroBanner";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["B1", "A1", "G1", "F1", "F0 Pro", "F0B Fênix", "EC Plus", "F Mini"];

export default function Index() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const filtered = selectedCategory
    ? products?.filter((p) => p.category === selectedCategory)
    : products;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <HeroBanner />

      <main id="produtos" className="container flex-1 py-12">
        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-product">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered?.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
