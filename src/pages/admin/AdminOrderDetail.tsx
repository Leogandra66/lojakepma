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

  const [tracking, setTracking] = useState("");
  useEffect(() => {
    setTracking((data?.order as { tracking_url?: string | null } | undefined)?.tracking_url ?? "");
  }, [data?.order]);

  const updateTracking = useMutation({
    mutationFn: async (tracking_url: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ tracking_url: tracking_url || null } as never)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link de rastreio salvo");
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!data?.order) return <p className="text-muted-foreground">Pedido não encontrado.</p>;

  const { order, items, payments, profile } = data;
  const o = order as typeof order & {
    customer_name?: string | null; customer_cpf?: string | null;
    customer_email?: string | null; customer_phone?: string | null;
    shipping_zip?: string | null; shipping_street?: string | null;
    shipping_number?: string | null; shipping_complement?: string | null;
    shipping_neighborhood?: string | null; shipping_city?: string | null;
    shipping_state?: string | null; tracking_url?: string | null;
  };
  const name = o.customer_name ?? profile?.full_name ?? null;
  const cpf = o.customer_cpf ?? profile?.cpf ?? null;
  const phone = o.customer_phone ?? profile?.phone ?? null;
  const email = o.customer_email ?? null;
  const addrParts = [
    o.shipping_street ?? profile?.address_street,
    o.shipping_number ?? profile?.address_number,
    o.shipping_complement ?? profile?.address_complement,
    o.shipping_neighborhood ?? profile?.address_neighborhood,
    o.shipping_city ?? profile?.address_city,
    o.shipping_state ?? profile?.address_state,
  ].filter(Boolean);
  const zip = o.shipping_zip ?? profile?.address_zip ?? null;

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
          <div><span className="text-muted-foreground">Nome: </span>{name ?? "-"}</div>
          <div><span className="text-muted-foreground">CPF: </span>{cpf ?? "-"}</div>
          <div><span className="text-muted-foreground">E-mail: </span>{email ?? "-"}</div>
          <div><span className="text-muted-foreground">Telefone: </span>{phone ?? "-"}</div>
          <div className="md:col-span-2">
            <span className="text-muted-foreground">Endereço: </span>
            {addrParts.length ? addrParts.join(", ") : "-"}
          </div>
          <div className="md:col-span-2">
            <span className="text-muted-foreground">CEP: </span>{zip ?? "-"}
          </div>
          <div className="md:col-span-2 font-mono text-xs text-muted-foreground">
            user_id: {order.user_id ?? "-"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="tracking">Link de rastreio</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="tracking"
              type="url"
              placeholder="https://..."
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <Button
              onClick={() => updateTracking.mutate(tracking.trim())}
              disabled={updateTracking.isPending || tracking === (o.tracking_url ?? "")}
            >
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
          {o.tracking_url && (
            <a
              href={o.tracking_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir rastreio atual
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            Este link aparecerá para o cliente no painel "Minha Conta".
          </p>
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
