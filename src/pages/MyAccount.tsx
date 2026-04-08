import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Clock, CheckCircle2 } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending_payment: "Aguardando Pagamento",
  paid: "Pago",
  partial_paid: "Parcialmente Pago",
  processing: "Em Processamento",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export default function MyAccount() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

  if (authLoading) return null;

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
            {orders?.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
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
                <span className="font-heading font-bold">R$ {Number(order.total).toFixed(2).replace(".", ",")}</span>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
