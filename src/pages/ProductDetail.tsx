import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImageGallery from "@/components/ProductImageGallery";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, CalendarDays, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { track } from "@/lib/analytics";

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

  const { data: productImages = [] } = useQuery({
    queryKey: ["product-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isAvailable = product && product.status !== "unavailable";

  useEffect(() => {
    if (product?.id) {
      track("product_view", { product_id: product.id, metadata: { name: product.name } });
    }
  }, [product?.id, product?.name]);

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Breadcrumb / back */}
        <div className="container pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a loja
          </Link>
        </div>

        {isLoading ? (
          <section className="container py-16">
            <div className="grid gap-12 md:grid-cols-2">
              <Skeleton className="aspect-square rounded-3xl" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </section>
        ) : product ? (
          <>
            {/* Hero do produto - estilo Apple */}
            <section className="container pt-8 pb-20 md:pt-12 md:pb-28">
              {product.category && (
                <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
                  {product.category}
                </p>
              )}
              <h1 className="text-center font-heading font-semibold tracking-tight text-4xl md:text-6xl lg:text-7xl mb-3">
                {product.name}
              </h1>
              {isAvailable && (
                <div className="text-center text-base md:text-lg text-foreground font-medium mb-12 space-y-1">
                  <p>em 10 vezes de R$ {formatPrice(product.price / 10)} no cartão</p>
                  <p>R$ {formatPrice(product.price * 0.9)} no Pix</p>
                </div>
              )}

              <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-start">
                {/* Galeria - fundo neutro, sem moldura pesada */}
                <div className="min-w-0">
                  <div className="rounded-3xl bg-secondary/40 p-6 md:p-10">
                    <ProductImageGallery
                      images={productImages}
                      fallbackUrl={product.image_url}
                      productName={product.name}
                      showPlekLogo={(product as any).uses_plek_technology === true}
                    />

                  </div>
                </div>

                {/* Informações - tipografia leve, espaço generoso */}
                <div className="flex min-w-0 flex-col gap-6 md:pt-4">
                  {/* Status */}
                  <div className="flex items-center gap-2 text-sm">
                    {product.status === "in_stock" && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">Em estoque · pronta entrega</span>
                      </>
                    )}
                    {product.status === "preorder" && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">Venda por encomenda</span>
                      </>
                    )}
                    {product.status === "unavailable" && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="text-muted-foreground">Indisponível no momento</span>
                      </>
                    )}
                  </div>

                  {isAvailable && (
                    <div className="space-y-1">
                      <p className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                        R$ {formatPrice(product.price)}
                      </p>
                      <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                        <Check className="h-4 w-4" /> Frete grátis para todo o Brasil
                      </p>
                    </div>
                  )}

                  {product.status === "preorder" && isAvailable && (
                    <div className="rounded-2xl border border-border bg-secondary/40 p-5 space-y-2">
                      <p className="font-medium text-sm">Como funciona a encomenda</p>
                      <p className="text-sm text-muted-foreground">
                        40% no ato:{" "}
                        <span className="text-foreground font-medium">
                          R$ {formatPrice(product.price * 0.4)}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        60% na entrega:{" "}
                        <span className="text-foreground font-medium">
                          R$ {formatPrice(product.price * 0.6)}
                        </span>
                      </p>
                      {product.preorder_estimated_delivery && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                          <CalendarDays className="h-4 w-4" />
                          Entrega prevista:{" "}
                          {new Date(product.preorder_estimated_delivery).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="pt-2">
                    {isAvailable ? (
                      <Button
                        size="lg"
                        className="btn-gold rounded-full w-full md:w-auto px-10 gap-2 h-12"
                        onClick={() => addItem(product)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Comprar
                      </Button>
                    ) : (
                      <Button size="lg" disabled className="rounded-full w-full md:w-auto px-10 h-12">
                        Indisponível
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 pt-2">
                    <p>Pagamento em até 12x · Pix com desconto</p>
                    <p>Garantia oficial Kepma · Suporte especializado</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Descrição - bloco editorial, full-bleed claro */}
            {product.description && (
              <section className="bg-secondary/40 py-20 md:py-28">
                <div className="container max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground text-center mb-4">
                    Sobre o instrumento
                  </p>
                  <h2 className="font-heading text-3xl md:text-5xl font-semibold tracking-tight text-center mb-10">
                    Cada detalhe importa.
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap break-words text-center">
                    {product.description}
                  </p>
                </div>
              </section>
            )}

            {/* Vídeo - showcase grande */}
            {(product as any).video_url &&
              (() => {
                const url = (product as any).video_url as string;
                const match = url.match(
                  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
                );
                const videoId = match?.[1];
                if (!videoId) return null;
                return (
                  <section className="py-20 md:py-28">
                    <div className="container max-w-5xl">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground text-center mb-4">
                        Veja em ação
                      </p>
                      <h2 className="font-heading text-3xl md:text-5xl font-semibold tracking-tight text-center mb-10">
                        Ouça antes de sentir.
                      </h2>
                      <div className="rounded-3xl overflow-hidden shadow-sm">
                        <iframe
                          className="w-full aspect-video"
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={`Vídeo - ${product.name}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </section>
                );
              })()}

            {/* CTA final */}
            {isAvailable && (
              <section className="bg-secondary/40 py-20 md:py-24">
                <div className="container text-center max-w-2xl">
                  <h2 className="font-heading text-3xl md:text-5xl font-semibold tracking-tight mb-4">
                    Pronto para tocar?
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Frete grátis, garantia oficial e parcelamento em até 12x.
                  </p>
                  <Button
                    size="lg"
                    className="btn-gold rounded-full px-10 gap-2 h-12"
                    onClick={() => addItem(product)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Comprar por R$ {formatPrice(product.price)}
                  </Button>
                </div>
              </section>
            )}
          </>
        ) : (
          <p className="container text-center text-muted-foreground py-32">Produto não encontrado.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
