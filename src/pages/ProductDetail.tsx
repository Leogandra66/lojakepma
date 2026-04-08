import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImageGallery from "@/components/ProductImageGallery";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, Package, Clock, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });

  const isAvailable = product && product.status !== "unavailable";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : product ? (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-20 w-20 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {product.category && (
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{product.category}</span>
              )}
              <h1 className="font-heading text-3xl font-bold">{product.name}</h1>

              {product.status === "in_stock" && (
                <span className="badge-instock w-fit"><Package className="inline h-3 w-3 mr-1" />Em estoque ({product.stock_quantity} unidades)</span>
              )}
              {product.status === "preorder" && (
                <span className="badge-preorder w-fit"><Clock className="inline h-3 w-3 mr-1" />Venda por encomenda</span>
              )}
              {product.status === "unavailable" && (
                <span className="badge-unavailable w-fit">Indisponível</span>
              )}

              <p className="font-heading text-4xl font-bold text-foreground">
                R$ {product.price.toFixed(2).replace(".", ",")}
              </p>

              {product.status === "preorder" && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2">
                  <p className="font-semibold text-sm">Condições de encomenda:</p>
                  <p className="text-sm text-muted-foreground">
                    • 40% no ato da compra: <strong className="text-foreground">R$ {(product.price * 0.4).toFixed(2).replace(".", ",")}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • 60% na entrega: <strong className="text-foreground">R$ {(product.price * 0.6).toFixed(2).replace(".", ",")}</strong>
                  </p>
                  {product.preorder_estimated_delivery && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                      <CalendarDays className="h-4 w-4" />
                      Entrega prevista: {new Date(product.preorder_estimated_delivery).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              )}

              {product.description && (
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              )}

              {isAvailable ? (
                <Button size="lg" className="btn-gold rounded-full w-fit gap-2 mt-4" onClick={() => addItem(product)}>
                  <ShoppingCart className="h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
              ) : (
                <Button size="lg" disabled className="rounded-full w-fit mt-4">
                  Produto Indisponível
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-20">Produto não encontrado.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
