import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Clock, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, CreditCard, Truck } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending_payment: "Aguardando Pagamento",
  paid: "Pago",
  partial_paid: "Parcialmente Pago",
  processing: "Em Processamento",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const captureMethodLabels: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  pix: "PIX",
};

export default function MyAccount() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/entrar?redirect=/minha-conta");
  }, [user, authLoading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orderItems } = useQuery({
    queryKey: ["my-order-items", expandedOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", expandedOrder!);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedOrder,
  });

  const { data: payments } = useQuery({
    queryKey: ["my-order-payments", expandedOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", expandedOrder!);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedOrder,
  });

  if (authLoading) return null;

  const toggleOrder = (id: string) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mb-8">{user?.email}</p>

        <h2 className="font-heading text-xl font-bold mb-4">Meus Pedidos</h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : orders?.length === 0 ? (
          <p className="text-muted-foreground py-8">Nenhum pedido realizado ainda.</p>
        ) : (
          <div className="space-y-3">
            {orders?.map((order) => {
              const isExpanded = expandedOrder === order.id;
              return (
                <div key={order.id} className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleOrder(order.id)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {order.status === "delivered" ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : order.has_preorder_items ? (
                        <Clock className="h-5 w-5 text-preorder" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold text-sm">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("pt-BR")} · {statusLabels[order.status] || order.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-heading font-bold">R$ {Number(order.total).toFixed(2).replace(".", ",")}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                      {(order as { tracking_url?: string | null }).tracking_url && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Rastreio do Envio</h4>
                          <a
                            href={(order as { tracking_url?: string | null }).tracking_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <Truck className="h-4 w-4" />
                            Acompanhar entrega
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                      {/* Itens */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itens do Pedido</h4>
                        {orderItems ? (
                          <div className="space-y-2">
                            {orderItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <span>{item.product_name}</span>
                                  {item.quantity > 1 && <span className="text-muted-foreground ml-1">x{item.quantity}</span>}
                                  {item.is_preorder && <span className="ml-2 text-xs text-preorder">(Pré-venda)</span>}
                                </div>
                                <span className="font-medium">R$ {(Number(item.unit_price) * item.quantity).toFixed(2).replace(".", ",")}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Skeleton className="h-8 w-full" />
                        )}
                      </div>

                      {/* Pagamento */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Pagamento</h4>
                        {payments ? (
                          payments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
                          ) : (
                            <div className="space-y-2">
                              {payments.map((payment) => (
                                <div key={payment.id} className="rounded-md bg-secondary/40 p-3 text-sm space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className="font-medium capitalize">{payment.status === "paid" ? "Pago" : payment.status === "pending" ? "Pendente" : payment.status}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Valor</span>
                                    <span className="font-medium">R$ {Number(payment.amount).toFixed(2).replace(".", ",")}</span>
                                  </div>
                                  {payment.capture_method && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Forma</span>
                                      <span className="flex items-center gap-1 font-medium">
                                        <CreditCard className="h-3.5 w-3.5" />
                                        {captureMethodLabels[payment.capture_method] || payment.capture_method}
                                      </span>
                                    </div>
                                  )}
                                  {payment.paid_at && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Pago em</span>
                                      <span className="font-medium">{new Date(payment.paid_at).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                  )}
                                  {payment.receipt_url && (
                                    <a
                                      href={payment.receipt_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Ver comprovante
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <Skeleton className="h-16 w-full" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
