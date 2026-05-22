import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/types";
import { Constants } from "@/integrations/supabase/types";

const statusLabel: Record<OrderStatus, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  partial_paid: "Parcialmente pago",
  processing: "Processando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const [orderRes, itemsRes, paymentsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id!).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id!),
        supabase.from("payments").select("*").eq("order_id", id!).order("created_at", { ascending: false }),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      let profile = null;
      if (orderRes.data?.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", orderRes.data.user_id)
          .maybeSingle();
        profile = p;
      }

      return { order: orderRes.data, items: itemsRes.data ?? [], payments: paymentsRes.data ?? [], profile };
    },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!data?.order) return <p className="text-muted-foreground">Pedido não encontrado.</p>;

  const { order, items, payments, profile } = data;

  return (
    <div className="space-y-6">
      <Link to="/admin/pedidos">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Pedido {order.id.slice(0, 8)}...</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Data</p>
            <p className="font-medium">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-medium">{formatBRL(Number(order.total))}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Desconto</p>
            <p className="font-medium">{formatBRL(Number(order.discount_amount ?? 0))}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pré-venda</p>
            <p className="font-medium">{order.has_preorder_items ? "Sim" : "Não"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <Select
              value={order.status}
              onValueChange={(v) => updateStatus.mutate(v as OrderStatus)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.order_status.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel[s as OrderStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
          {profile ? (
            <>
              <div><span className="text-muted-foreground">Nome: </span>{profile.full_name ?? "-"}</div>
              <div><span className="text-muted-foreground">CPF: </span>{profile.cpf ?? "-"}</div>
              <div><span className="text-muted-foreground">Telefone: </span>{profile.phone ?? "-"}</div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Endereço: </span>
                {[profile.address_street, profile.address_number, profile.address_complement, profile.address_neighborhood, profile.address_city, profile.address_state, profile.address_zip]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground md:col-span-2">Sem perfil cadastrado.</p>
          )}
          <div className="md:col-span-2 font-mono text-xs text-muted-foreground">
            user_id: {order.user_id ?? "-"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground">Sem itens.</p>
          ) : (
            <ul className="divide-y">
              {items.map((it) => (
                <li key={it.id} className="py-3 flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{it.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qtd: {it.quantity} × {formatBRL(Number(it.unit_price))}
                      {it.is_preorder && (
                        <Badge variant="outline" className="ml-2">Pré-venda</Badge>
                      )}
                    </p>
                  </div>
                  <p className="font-medium">{formatBRL(Number(it.unit_price) * it.quantity)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground">Nenhum pagamento.</p>
          ) : (
            <ul className="divide-y">
              {payments.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">
                        {formatBRL(Number(p.amount))}{" "}
                        <Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.payment_type} • {p.capture_method ?? "-"} •{" "}
                        {new Date(p.created_at).toLocaleString("pt-BR")}
                      </p>
                      {p.transaction_nsu && (
                        <p className="text-xs text-muted-foreground font-mono">NSU: {p.transaction_nsu}</p>
                      )}
                    </div>
                    {p.receipt_url && (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-sm underline">
                        Comprovante
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
