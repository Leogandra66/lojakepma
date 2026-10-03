import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Images, Copy, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { BlingSyncPanel } from "@/components/admin/BlingSyncPanel";
import AdminImageManager from "@/components/admin/AdminImageManager";

const statusLabels: Record<string, string> = {
  in_stock: "Em Estoque",
  preorder: "Encomenda",
  unavailable: "Indisponível",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  in_stock: "default",
  preorder: "secondary",
  unavailable: "destructive",
};

const ELECTRONICS_TAG_OPTIONS = [
  "Versão acústica",
  "Eletrônica K1",
  "Eletrônica K10 Pro",
  "Eletrônica K11",
  "Eletrônica Elfin",
  "Eletrônica S1 Pro",
  "Eletrônica L1",
  "Eletrônica X1 Pro",
  "LRbaggs Anthem Stage Pro",
];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  price_b2b: string;
  category: string;
  status: "in_stock" | "preorder" | "unavailable";
  stock_quantity: string;
  bling_code: string;
  preorder_estimated_delivery: string;
  video_url: string;
  electronics_tag: string;
  uses_plek_technology: boolean;
  ean_gtin: string;
  package_weight_kg: string;
  package_height_cm: string;
  package_width_cm: string;
  package_length_cm: string;
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  price_b2b: "",
  category: "",
  status: "in_stock",
  stock_quantity: "0",
  bling_code: "",
  preorder_estimated_delivery: "",
  video_url: "",
  electronics_tag: "",
  uses_plek_technology: false,
  ean_gtin: "",
  package_weight_kg: "",
  package_height_cm: "",
  package_width_cm: "",
  package_length_cm: "",
};

// Valida EAN-8, UPC-A (12), EAN-13 e GTIN-14 pelo dígito verificador (módulo 10).
function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// Converte texto (aceita vírgula decimal) em número positivo ou null.
function parsePositive(value: string): number | null {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_products");
      if (error) throw error;
      return data as Product[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const ean = data.ean_gtin.replace(/\D/g, "");
      if (ean && !isValidGtin(ean)) {
        throw new Error("EAN/GTIN inválido. Confira os dígitos (8, 12, 13 ou 14 números).");
      }
      const packageFields = [
        ["Peso", data.package_weight_kg],
        ["Altura", data.package_height_cm],
        ["Largura", data.package_width_cm],
        ["Comprimento", data.package_length_cm],
      ] as const;
      for (const [label, raw] of packageFields) {
        if (raw.trim() && parsePositive(raw) === null) {
          throw new Error(`${label} da embalagem deve ser um número maior que zero.`);
        }
      }
      const payload = {
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        price_b2b: data.price_b2b ? parseFloat(data.price_b2b) : null,
        category: data.category || null,
        status: data.status,
        stock_quantity: parseInt(data.stock_quantity) || 0,
        bling_code: data.bling_code.trim() || null,
        video_url: data.video_url || null,
        preorder_estimated_delivery: data.status === "preorder" && data.preorder_estimated_delivery
          ? data.preorder_estimated_delivery
          : null,
        electronics_tag: data.electronics_tag || null,
        uses_plek_technology: data.uses_plek_technology,
        ean_gtin: ean || null,
        package_weight_kg: parsePositive(data.package_weight_kg),
        package_height_cm: parsePositive(data.package_height_cm),
        package_width_cm: parsePositive(data.package_width_cm),
        package_length_cm: parsePositive(data.package_length_cm),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setEditingProduct(null);
      setForm(emptyForm);
      toast.success(editingProduct ? "Produto atualizado!" : "Produto criado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cloneMutation = useMutation({
    mutationFn: async (product: Product) => {
      const payload = {
        name: `${product.name} CÓPIA`,
        description: product.description || null,
        price: product.price,
        price_b2b: product.price_b2b,
        category: product.category || null,
        status: "unavailable" as const,
        stock_quantity: 0,
        video_url: (product as any).video_url || null,
        preorder_estimated_delivery: null,
        electronics_tag: (product as any).electronics_tag || null,
        uses_plek_technology: (product as any).uses_plek_technology ?? false,
        // EAN/GTIN é único por produto, então não é copiado no clone.
        package_weight_kg: product.package_weight_kg,
        package_height_cm: product.package_height_cm,
        package_width_cm: product.package_width_cm,
        package_length_cm: product.package_length_cm,
      };
      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto clonado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto removido!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      price_b2b: product.price_b2b === null ? "" : String(product.price_b2b),
      category: product.category || "",
      status: product.status,
      stock_quantity: String(product.stock_quantity),
      bling_code: (product as any).bling_code || "",
      preorder_estimated_delivery: product.preorder_estimated_delivery || "",
      video_url: (product as any).video_url || "",
      electronics_tag: (product as any).electronics_tag || "",
      uses_plek_technology: (product as any).uses_plek_technology ?? false,
      ean_gtin: product.ean_gtin || "",
      package_weight_kg: product.package_weight_kg === null ? "" : String(product.package_weight_kg),
      package_height_cm: product.package_height_cm === null ? "" : String(product.package_height_cm),
      package_width_cm: product.package_width_cm === null ? "" : String(product.package_width_cm),
      package_length_cm: product.package_length_cm === null ? "" : String(product.package_length_cm),
    });
    setDialogOpen(true);
  }

  function openImages(product: Product) {
    setSelectedProduct(product);
    setImageDialogOpen(true);
  }

  function handleStatusChange(v: ProductForm["status"]) {
    const updates: Partial<ProductForm> = { status: v };
    if (v === "unavailable") {
      updates.stock_quantity = "0";
    }
    setForm({ ...form, ...updates });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    saveMutation.mutate(form);
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o catálogo de produtos da loja</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      <BlingSyncPanel />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto pelo nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Preço B2B</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Cód. Bling</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                  <TableCell>{p.category || "—"}</TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>{p.price_b2b === null ? "—" : formatPrice(p.price_b2b)}</TableCell>
                  <TableCell>{p.stock_quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{(p as any).bling_code || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status]}>
                      {statusLabels[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={(p as any).active !== false}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: p.id, active: checked })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => cloneMutation.mutate(p)} title="Clonar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openImages(p)} title="Imagens">
                        <Images className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Remover este produto?")) deleteMutation.mutate(p.id);
                        }}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                  </TableCell>

                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
{["B1", "A1", "G1", "F1", "F0 Pro", "F0B Fênix", "EC Plus", "FC Mini", "Eletrônica"].map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço B2B (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_b2b}
                  onChange={(e) => setForm({ ...form, price_b2b: e.target.value })}
                  placeholder="Preço de atacado"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => handleStatusChange(v as ProductForm["status"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">Em Estoque</SelectItem>
                    <SelectItem value="preorder">Encomenda</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {form.status === "preorder"
                    ? "Quantidade para Encomenda"
                    : "Quantidade em Estoque"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  disabled={form.status === "unavailable"}
                />
              </div>
            </div>
            <div>
              <Label>Código Bling (SKU)</Label>
              <Input
                value={form.bling_code}
                onChange={(e) => setForm({ ...form, bling_code: e.target.value })}
                placeholder="Código do produto no Bling para sincronizar o estoque"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use o mesmo código cadastrado no Bling. É por ele que o estoque é atualizado automaticamente.
              </p>
            </div>
            <div>
              <Label>EAN / GTIN</Label>
              <Input
                inputMode="numeric"
                maxLength={14}
                value={form.ean_gtin}
                onChange={(e) => setForm({ ...form, ean_gtin: e.target.value.replace(/\D/g, "") })}
                placeholder="Código de barras (8, 12, 13 ou 14 dígitos)"
              />
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <Label className="text-base font-semibold">Dados da embalagem</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.001"
                    value={form.package_weight_kg}
                    onChange={(e) => setForm({ ...form, package_weight_kg: e.target.value })}
                    placeholder="Ex.: 2.500"
                  />
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={form.package_height_cm}
                    onChange={(e) => setForm({ ...form, package_height_cm: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Largura (cm)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={form.package_width_cm}
                    onChange={(e) => setForm({ ...form, package_width_cm: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Comprimento (cm)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={form.package_length_cm}
                    onChange={(e) => setForm({ ...form, package_length_cm: e.target.value })}
                  />
                </div>
              </div>
            </div>
            {form.status === "preorder" && (
              <div>
                <Label>Previsão de Entrega</Label>
                <Input
                  type="date"
                  value={form.preorder_estimated_delivery}
                  onChange={(e) => setForm({ ...form, preorder_estimated_delivery: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Vídeo do YouTube (URL)</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Tag Eletrônica</Label>
              <Select
                value={form.electronics_tag || "__none__"}
                onValueChange={(v) => setForm({ ...form, electronics_tag: v === "__none__" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {ELECTRONICS_TAG_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox
                id="uses_plek_technology"
                checked={form.uses_plek_technology}
                onCheckedChange={(v) => setForm({ ...form, uses_plek_technology: v === true })}
              />
              <Label htmlFor="uses_plek_technology" className="cursor-pointer">
                Usa tecnologia Plek (exibe logo discreta na imagem do produto)
              </Label>
            </div>



            {/* Image Manager inline - only for existing products */}
            {editingProduct && (
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-2 block">Imagens do Produto</Label>
                <AdminImageManager product={editingProduct} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Manager Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Imagens - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && <AdminImageManager product={selectedProduct} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
