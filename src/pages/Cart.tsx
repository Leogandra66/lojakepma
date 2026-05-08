import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Clock } from "lucide-react";

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice, preorderTotal, regularTotal, hasPreorderItems, clearCart } = useCart();
  const { user } = useAuth();

  const depositAmount = preorderTotal * 0.4;
  const amountDueNow = regularTotal + depositAmount;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-8">
        <h1 className="font-heading text-3xl font-bold mb-8">Carrinho</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Seu carrinho está vazio</p>
            <Link to="/">
              <Button className="btn-gold rounded-full">Ver Produtos</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">Sem img</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex justify-between">
                      <Link to={`/produto/${product.id}`} className="font-heading font-semibold hover:text-primary">
                        {product.name}
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeItem(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {product.status === "preorder" && (
                      <span className="text-xs text-preorder flex items-center gap-1"><Clock className="h-3 w-3" />Encomenda</span>
                    )}
                    <div className="flex items-end justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product.id, quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product.id, quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-heading font-bold">R$ {(product.price * quantity).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearCart}>Limpar carrinho</Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 h-fit space-y-4">
              <h2 className="font-heading text-xl font-bold">Resumo</h2>
              
              {hasPreorderItems && (
                <div className="space-y-2 rounded-md bg-secondary/50 p-3 text-sm">
                  <p className="font-semibold">Itens em estoque: <span className="text-foreground">R$ {regularTotal.toFixed(2).replace(".", ",")}</span></p>
                  <p className="font-semibold">Encomendas (40% agora): <span className="text-foreground">R$ {depositAmount.toFixed(2).replace(".", ",")}</span></p>
                  <p className="text-xs text-muted-foreground">Restante de encomendas (60%): R$ {(preorderTotal * 0.6).toFixed(2).replace(".", ",")}</p>
                </div>
              )}

              <div className="flex justify-between text-lg font-heading font-bold border-t border-border pt-4">
                <span>Pagar agora:</span>
                <span>R$ {amountDueNow.toFixed(2).replace(".", ",")}</span>
              </div>

              {user ? (
                <Link to="/checkout">
                  <Button size="lg" className="btn-gold w-full rounded-full gap-2">
                    Finalizar Compra <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link to="/entrar?redirect=/checkout">
                    <Button size="lg" className="btn-gold w-full rounded-full">
                      Entrar para Comprar
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-muted-foreground">É necessário estar logado para finalizar a compra</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
