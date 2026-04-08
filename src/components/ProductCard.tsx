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
      <Link to={`/produto/${product.id}`} className="block aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/produto/${product.id}`} className="font-heading text-base font-semibold leading-tight hover:text-primary transition-colors">
            {product.name}
          </Link>
          {statusBadge(product)}
        </div>
        {product.category && (
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{product.category}</span>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <span className="font-heading text-xl font-bold text-foreground">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
            {product.status === "preorder" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                40% no pedido · 60% na entrega
              </p>
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
