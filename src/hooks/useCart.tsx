import { createContext, useContext, useState, useCallback } from "react";
import type { CartItem, Product } from "@/lib/types";
import { toast } from "sonner";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  preorderTotal: number;
  regularTotal: number;
  hasPreorderItems: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product) => {
    if (product.status === "unavailable") {
      toast.error("Produto indisponível");
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (product.status === "in_stock" && existing.quantity >= product.stock_quantity) {
          toast.error("Quantidade máxima em estoque atingida");
          return prev;
        }
        toast.success("Quantidade atualizada no carrinho");
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      toast.success("Produto adicionado ao carrinho");
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    toast.info("Produto removido do carrinho");
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const preorderTotal = items
    .filter((i) => i.product.status === "preorder")
    .reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const regularTotal = totalPrice - preorderTotal;
  const hasPreorderItems = items.some((i) => i.product.status === "preorder");

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, preorderTotal, regularTotal, hasPreorderItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
