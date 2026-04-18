import { Link } from "react-router-dom";
import type { Product } from "@/lib/types";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, Package } from "lucide-react";

function statusBadge(product: Product) {
  if (product.status === "in_stock") {
    return <span className="badge-instock"><Package className="inline h-3 w-3 mr-1" />Em estoque</span>;
  }
  if (product.status === "preorder") {
    return <span className="badge-preorder"><Clock className="inline h-3 w-3 mr-1" />Encomenda</span>;
  }
  return <span className="badge-unavailable">Indisponível</span>;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const isAvailable = product.status !== "unavailable";

  return (
    <div className={`card-product flex flex-col ${!isAvailable ? "opacity-60" : ""}`}>
      <Link to={`/produto/${product.id}`} className="block aspect-square overflow-hidden bg-white rounded-t-lg">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-4 transition-transform duration-500 hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Link to={`/produto/${product.id}`} className="font-heading text-base font-semibold leading-tight hover:text-primary transition-colors">
          {product.name}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          {statusBadge(product)}
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">Frete Grátis</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {isAvailable ? (
              <>
                <span className="font-heading text-xl font-bold text-foreground">
                  R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] text-muted-foreground leading-tight">no PIX ou em até 12x no cartão</p>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Produto indisponível</span>
            )}
            {product.status === "preorder" && isAvailable && (
              <div className="text-xs text-muted-foreground mt-0.5">
                <p>40% no pedido · 60% na entrega</p>
                {product.preorder_estimated_delivery && (
                  <p className="mt-0.5">Previsão: {new Date(product.preorder_estimated_delivery).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
            )}
          </div>
          {isAvailable && (
            <Button size="sm" className="btn-gold rounded-full" onClick={() => addItem(product)}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
