import { Link } from "react-router-dom";
import type { Product } from "@/lib/types";
import { useCart } from "@/hooks/useCart";
import { Package, CalendarDays } from "lucide-react";
import plekLogo from "@/assets/plek-logo.jpg";

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
        className="mt-6 mb-6 block aspect-square overflow-hidden bg-secondary/30 rounded-2xl p-4 sm:p-6 relative"
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
        {(product as any).uses_plek_technology && (
          <img
            src={plekLogo}
            alt="Tecnologia Plek"
            title="Este instrumento usa tecnologia Plek"
            className="absolute bottom-3 right-3 h-5 sm:h-6 w-auto opacity-70 pointer-events-none"
          />
        )}
      </Link>

      {/* Encomenda: prazo e condições */}
      {product.status === "preorder" && (
        <div className="mb-4 rounded-2xl bg-secondary/50 p-3 space-y-1">
          {product.preorder_estimated_delivery && (
            <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Chegada prevista:{" "}
              <span className="font-medium text-foreground">
                {new Date(product.preorder_estimated_delivery).toLocaleDateString("pt-BR")}
              </span>
            </p>
          )}
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            40% de entrada (R$ {(product.price * 0.4).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) e 60% na entrega
          </p>
        </div>
      )}

      {/* Footer: price + CTA */}
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          {isAvailable ? (
            <>
              <span className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                em 10x de R$ {(product.price / 10).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} no cartão
              </span>
              <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 leading-snug font-medium">
                R$ {(product.price * 0.9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} no Pix
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Indisponível</span>
          )}
        </div>
        {isAvailable && (
          <button
            onClick={() => addItem(product)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md shrink-0"
          >
            {product.status === "preorder" ? "Encomendar" : "Comprar"}
          </button>
        )}
      </div>
    </div>
  );
}
