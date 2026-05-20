import { Link } from "react-router-dom";
import type { Product } from "@/lib/types";
import { useCart } from "@/hooks/useCart";
import { Package } from "lucide-react";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const isAvailable = product.status !== "unavailable";

  const tag =
    product.status === "preorder"
      ? "Encomenda"
      : product.status === "unavailable"
        ? "Indisponível"
        : null;

  return (
    <div
      className={`group flex flex-col rounded-3xl bg-card p-6 sm:p-8 transition-all duration-300 hover:shadow-[0_20px_60px_-20px_hsl(30_10%_12%/0.15)] ${
        !isAvailable ? "opacity-70" : ""
      }`}
    >
      {/* Tag */}
      <div className="min-h-5 mb-2 flex items-center gap-2 flex-wrap">
        {tag && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            {tag}
          </span>
        )}
        {(product as any).electronics_tag && (
          <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            {(product as any).electronics_tag}
          </span>
        )}
      </div>

      {/* Title - altura fixa para alinhar todas as imagens */}
      <Link
        to={`/produto/${product.id}`}
        className="font-heading text-xl sm:text-2xl font-semibold leading-tight tracking-tight text-foreground hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem] sm:min-h-[4rem]"
        title={product.name}
      >
        {product.name}
      </Link>

      {/* Image - aspect-square com padding interno para evitar corte */}
      <Link
        to={`/produto/${product.id}`}
        className="mt-6 mb-6 block aspect-square overflow-hidden bg-secondary/30 rounded-2xl p-4 sm:p-6"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
      </Link>

      {/* Footer: price + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex flex-col">
          {isAvailable ? (
            <>
              <span className="text-xs text-muted-foreground">A partir de</span>
              <span className="font-heading text-lg sm:text-xl font-semibold text-foreground">
                R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Indisponível</span>
          )}
        </div>
        {isAvailable && (
          <button
            onClick={() => addItem(product)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Comprar
          </button>
        )}
      </div>
    </div>
  );
}
