import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroBanner from "@/components/HeroBanner";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Index() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("status", { ascending: true })
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const inStock = products?.filter((p) => p.status === "in_stock") ?? [];
  const preorder = products?.filter((p) => p.status === "preorder") ?? [];
  const unavailable = products?.filter((p) => p.status === "unavailable") ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <HeroBanner />

      <main id="produtos" className="container flex-1 py-12">
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
        ) : products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-heading text-2xl text-muted-foreground">Nenhum produto cadastrado ainda</p>
            <p className="text-sm text-muted-foreground mt-2">Os produtos aparecerão aqui quando forem adicionados.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {inStock.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-6">Em Estoque</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {inStock.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )}

            {preorder.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-6">Disponível por Encomenda</h2>
                <p className="text-sm text-muted-foreground mb-4">40% no ato da compra · 60% na entrega do produto</p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {preorder.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )}

            {unavailable.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-6 text-muted-foreground">Indisponíveis</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {unavailable.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
