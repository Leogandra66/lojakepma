import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface CouponForm {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  active: boolean;
  expires_at: string;
  applies_to_all: boolean;
  selected_product_ids: string[];
}

const emptyForm: CouponForm = {
  code: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_value: "0",
  max_uses: "",
  active: true,
  expires_at: "",
  applies_to_all: true,
  selected_product_ids: [],
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch coupon_products counts
      const couponIds = data.map((c: any) => c.id);
      const { data: cpData } = await supabase
        .from("coupon_products")
        .select("coupon_id, product_id")
        .in("coupon_id", couponIds);

      const countMap: Record<string, number> = {};
      (cpData ?? []).forEach((cp: any) => {
        countMap[cp.coupon_id] = (countMap[cp.coupon_id] || 0) + 1;
      });

      return data.map((c: any) => ({ ...c, _product_count: countMap[c.id] || 0 }));
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CouponForm) => {
      const payload: any = {
        code: data.code.toUpperCase().trim(),
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        min_order_value: parseFloat(data.min_order_value) || 0,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        active: data.active,
        expires_at: data.expires_at || null,
      };

      let couponId: string;

      if (editingCoupon) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingCoupon.id);
        if (error) throw error;
        couponId = editingCoupon.id;
      } else {
        const { data: inserted, error } = await supabase.from("coupons").insert(payload).select().single();
        if (error) throw error;
        couponId = inserted.id;
      }

      // Sync coupon_products
      await supabase.from("coupon_products").delete().eq("coupon_id", couponId);

      if (!data.applies_to_all && data.selected_product_ids.length > 0) {
        const rows = data.selected_product_ids.map((pid) => ({
          coupon_id: couponId,
          product_id: pid,
        }));
        const { error: cpErr } = await supabase.from("coupon_products").insert(rows);
        if (cpErr) throw cpErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDialogOpen(false);
      toast.success(editingCoupon ? "Cupom atualizado!" : "Cupom criado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  function openNew() {
    setEditingCoupon(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  async function openEdit(coupon: any) {
    // Fetch linked products
    const { data: cpData } = await supabase
      .from("coupon_products")
      .select("product_id")
      .eq("coupon_id", coupon.id);

    const selectedIds = (cpData ?? []).map((cp: any) => cp.product_id);

    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      min_order_value: String(coupon.min_order_value || 0),
      max_uses: coupon.max_uses ? String(coupon.max_uses) : "",
      active: coupon.active,
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
      applies_to_all: selectedIds.length === 0,
      selected_product_ids: selectedIds,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.discount_value) {
      toast.error("Preencha código e valor do desconto");
      return;
    }
    if (!form.applies_to_all && form.selected_product_ids.length === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    saveMutation.mutate(form);
  }

  function toggleProduct(productId: string) {
    setForm((prev) => {
      const selected = prev.selected_product_ids.includes(productId)
        ? prev.selected_product_ids.filter((id) => id !== productId)
        : [...prev.selected_product_ids, productId];
      return { ...prev, selected_product_ids: selected };
    });
  }

  function formatDiscount(coupon: any) {
    return coupon.discount_type === "percentage"
      ? `${coupon.discount_value}%`
      : `R$ ${Number(coupon.discount_value).toFixed(2).replace(".", ",")}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Cupons de Desconto</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Cupom</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Pedido Mínimo</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : coupons.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cupom cadastrado</TableCell></TableRow>
            ) : (
              coupons.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell>{formatDiscount(c)}</TableCell>
                  <TableCell>
                    {c._product_count === 0 ? (
                      <Badge variant="secondary">Todos</Badge>
                    ) : (
                      <Badge variant="outline">{c._product_count} produto{c._product_count > 1 ? "s" : ""}</Badge>
                    )}
                  </TableCell>
                  <TableCell>R$ {Number(c.min_order_value || 0).toFixed(2).replace(".", ",")}</TableCell>
                  <TableCell>{c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                  <TableCell>{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "default" : "destructive"}>
                      {c.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: DESCONTO10"
                maxLength={30}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Desconto</Label>
                <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pedido Mínimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.min_order_value}
                  onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                />
              </div>
              <div>
                <Label>Limite de Usos</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Data de Expiração</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>

            {/* Product selection */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.applies_to_all}
                  onCheckedChange={(v) => setForm({ ...form, applies_to_all: v, selected_product_ids: v ? [] : form.selected_product_ids })}
                />
                <Label>Aplicar a todos os produtos</Label>
              </div>
              {!form.applies_to_all && (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                  ) : (
                    products.map((p: any) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                        <Checkbox
                          checked={form.selected_product_ids.includes(p.id)}
                          onCheckedChange={() => toggleProduct(p.id)}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
