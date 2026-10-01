import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookUser, ChevronDown, ChevronUp, ClipboardList, Eye, Loader2, LogOut, Minus, Package, Pencil, Play, Plus, Search, Send, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductImageGallery from "@/components/ProductImageGallery";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import kepmaLogo from "@/assets/kepma-logo.webp";
import { toast } from "sonner";
import { z } from "zod";

type Client = Database["public"]["Tables"]["b2b_clients"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];
type PaymentTerm = Database["public"]["Tables"]["b2b_payment_terms"]["Row"];
type Order = Database["public"]["Tables"]["b2b_orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["b2b_order_items"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

const EMPTY_CLIENT = { company_name: "", cnpj: "", state_registration: "", contact_name: "", phone: "", email: "", address_zip: "", address_street: "", address_number: "", address_complement: "", address_neighborhood: "", address_city: "", address_state: "" };
type ClientForm = typeof EMPTY_CLIENT;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const statusLabel = { aguardando_aprovacao: "Aguardando aprovação", aprovado: "Aprovado", recusado: "Recusado", cancelado: "Cancelado" } as const;
const OUT_OF_STATE_DISCOUNT = 0.14;
const BRAZILIAN_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const formatCnpj = (value: string) => onlyDigits(value).slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
const isValidCnpj = (value: string) => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calculateDigit = (length: number) => {
    let factor = length - 7;
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cnpj[index]) * factor;
      factor -= 1;
      if (factor < 2) factor = 9;
    }
    const result = 11 - (sum % 11);
    return result > 9 ? 0 : result;
  };
  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
};
const optionalField = (max: number) => z.string().trim().max(max, "Campo muito longo");
const clientSchema = z.object({
  company_name: z.string().trim().min(1, "Informe a razão social ou nome.").max(160),
  cnpj: z.string().trim().refine(isValidCnpj, "Informe um CNPJ válido."),
  state_registration: z.string().trim().min(1, "Informe a inscrição estadual ou Isento.").max(30).regex(/^(?:[Ii][Ss][Ee][Nn][Tt][Oo]|[0-9A-Za-z./-]{2,30})$/, "Informe uma inscrição estadual válida ou Isento."),
  contact_name: z.string().trim().min(1, "Informe a pessoa de contato.").max(120),
  phone: z.string().trim().min(1, "Informe o telefone.").max(30),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  address_zip: z.string().trim().min(1, "Informe o CEP.").max(10),
  address_street: z.string().trim().min(1, "Informe a rua.").max(160),
  address_number: z.string().trim().min(1, "Informe o número.").max(30),
  address_complement: optionalField(100),
  address_neighborhood: z.string().trim().min(1, "Informe o bairro.").max(100),
  address_city: z.string().trim().min(1, "Informe a cidade.").max(100),
  address_state: z.enum(BRAZILIAN_STATES, { errorMap: () => ({ message: "Selecione o estado." }) }),
});

export default function B2BDashboard() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("catalogo");
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(EMPTY_CLIENT);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const { data: account } = useQuery({
    queryKey: ["b2b-account", user?.id], enabled: Boolean(user),
    queryFn: async () => { const { data, error } = await supabase.from("b2b_accounts").select("*").eq("user_id", user?.id ?? "").single(); if (error) throw error; return data; },
  });
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["b2b-clients", account?.id], enabled: Boolean(account),
    queryFn: async () => { const { data, error } = await supabase.from("b2b_clients").select("*").eq("rep_account_id", account?.id ?? "").order("company_name"); if (error) throw error; return data; },
  });
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["b2b-products"],
    queryFn: async () => { const { data, error } = await supabase.rpc("get_b2b_catalog"); if (error) throw error; return data as Product[]; },
  });
  const { data: terms = [] } = useQuery({
    queryKey: ["b2b-terms"],
    queryFn: async () => { const { data, error } = await supabase.from("b2b_payment_terms").select("*").eq("active", true).order("name"); if (error) throw error; return data; },
  });
  const { data: productImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ["b2b-product-images", detailProduct?.id], enabled: Boolean(detailProduct),
    queryFn: async () => { const { data, error } = await supabase.from("product_images").select("id,image_url,position,product_id,created_at").eq("product_id", detailProduct?.id ?? "").order("position"); if (error) throw error; return data as ProductImage[]; },
  });
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["b2b-orders", account?.id], enabled: Boolean(account),
    queryFn: async () => { const { data, error } = await supabase.from("b2b_orders").select("*").eq("rep_account_id", account?.id ?? "").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  const { data: orderItems = [] } = useQuery({
    queryKey: ["b2b-order-items", orders.map((o) => o.id).join(",")], enabled: orders.length > 0,
    queryFn: async () => { const { data, error } = await supabase.from("b2b_order_items").select("*").in("order_id", orders.map((o) => o.id)).order("created_at"); if (error) throw error; return data; },
  });

  const saveClient = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("Conta comercial não encontrada.");
      const parsed = clientSchema.safeParse(clientForm);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revise os dados do cliente.");
      const normalized = { ...parsed.data, cnpj: onlyDigits(parsed.data.cnpj), state_registration: parsed.data.state_registration.toLocaleLowerCase("pt-BR") === "isento" ? "Isento" : parsed.data.state_registration };
      const payload = Object.fromEntries(Object.entries(normalized).map(([key, value]) => [key, value || null])) as Database["public"]["Tables"]["b2b_clients"]["Insert"];
      payload.company_name = normalized.company_name; payload.cnpj = normalized.cnpj; payload.state_registration = normalized.state_registration; payload.rep_account_id = account.id;
      if (editingClient) { const { error } = await supabase.from("b2b_clients").update(payload).eq("id", editingClient.id); if (error) throw error; }
      else { const { error } = await supabase.from("b2b_clients").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["b2b-clients"] }); setClientOpen(false); toast.success(editingClient ? "Cliente atualizado." : "Cliente cadastrado."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteClient = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("b2b_clients").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["b2b-clients"] }); toast.success("Cliente removido."); },
    onError: () => toast.error("Não foi possível remover. O cliente pode estar vinculado a pedidos."),
  });
  const createOrder = useMutation({
    mutationFn: async () => {
      const items = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([product_id, quantity]) => ({ product_id, quantity }));
      if (!selectedClient || !selectedTerm || items.length === 0) throw new Error("Selecione o cliente, a condição e ao menos um produto.");
      const client = clients.find((item) => item.id === selectedClient);
      if (!client?.address_state?.trim()) throw new Error("Informe o estado do cliente antes de enviar o pedido.");
      const { data, error } = await supabase.rpc("create_b2b_order", { _client_id: selectedClient, _payment_term_id: selectedTerm, _notes: notes.trim(), _items: items as Json });
      if (error) throw error; return data;
    },
    onSuccess: () => { setQuantities({}); setSelectedClient(""); setSelectedTerm(""); setNotes(""); void queryClient.invalidateQueries({ queryKey: ["b2b-orders"] }); setTab("pedidos"); toast.success("Pedido enviado para aprovação."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredProducts = useMemo(() => { const q = search.trim().toLocaleLowerCase("pt-BR"); return products.filter((p) => !q || p.name.toLocaleLowerCase("pt-BR").includes(q) || p.bling_code?.toLocaleLowerCase("pt-BR").includes(q)); }, [products, search]);
  const filteredClients = useMemo(() => { const q = clientSearch.trim().toLocaleLowerCase("pt-BR"); const digits = onlyDigits(q); return clients.filter((c) => !q || c.company_name.toLocaleLowerCase("pt-BR").includes(q) || (digits && c.cnpj?.includes(digits)) || c.state_registration?.toLocaleLowerCase("pt-BR").includes(q)); }, [clients, clientSearch]);
  const selectedClientData = clients.find((client) => client.id === selectedClient);
  const selectedClientState = selectedClientData?.address_state?.trim().toUpperCase() ?? "";
  const hasClientState = selectedClientState.length === 2;
  const hasOutOfStateDiscount = hasClientState && selectedClientState !== "MG";
  const effectivePrice = (product: Product) => Number((Number(product.price_b2b) * (hasOutOfStateDiscount ? 1 - OUT_OF_STATE_DISCOUNT : 1)).toFixed(2));
  const cartProducts = products.filter((p) => (quantities[p.id] ?? 0) > 0);
  const total = cartProducts.reduce((sum, p) => sum + effectivePrice(p) * (quantities[p.id] ?? 0), 0);
  const detailVideoId = detailProduct?.video_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)?.[1];

  function setQuantity(id: string, quantity: number) { setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(10000, quantity || 0)) })); }
  function openClient(client?: Client) { setEditingClient(client ?? null); setClientForm(client ? Object.fromEntries(Object.keys(EMPTY_CLIENT).map((key) => [key, String(client[key as keyof Client] ?? "")])) as ClientForm : EMPTY_CLIENT); setClientOpen(true); }
  const clientName = (id: string) => clients.find((client) => client.id === id)?.company_name ?? "Cliente";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-foreground text-background">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-5"><img src={kepmaLogo} alt="Kepma" className="h-8 w-auto brightness-0 invert" /><span className="hidden border-l border-background/20 pl-5 text-sm text-background/70 sm:block">Portal do representante</span></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-background/70 sm:block">{account?.company_name || user?.email}</span><Button variant="ghost" size="icon" onClick={() => void signOut()} className="text-background hover:bg-background/10 hover:text-background" aria-label="Sair"><LogOut className="h-4 w-4" /></Button></div>
        </div>
      </header>
      <section className="border-b bg-card"><div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8"><p className="text-sm font-semibold text-primary">Área B2B</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Olá, {account?.company_name || "representante"}</h1><p className="mt-2 text-sm text-muted-foreground">Monte pedidos para seus clientes e acompanhe cada aprovação.</p></div></section>

      <Tabs value={tab} onValueChange={setTab} className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="catalogo" className="gap-2"><Package className="h-4 w-4" /> Catálogo</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2"><BookUser className="h-4 w-4" /> Clientes</TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-2"><ClipboardList className="h-4 w-4" /> Pedidos</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-6">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section>
              <div className="mb-5 flex items-center gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto ou código" className="pl-9" /></div><Badge variant="outline">{filteredProducts.length} produtos</Badge></div>
              {hasOutOfStateDiscount && <div className="mb-5 border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm"><strong>Preço para {selectedClientState}:</strong> desconto de 14% já aplicado em todo o catálogo.</div>}
              {selectedClient && !hasClientState && <div className="mb-5 border-l-4 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">Complete o estado deste cliente para visualizar os preços corretos e enviar o pedido.</div>}
              {productsLoading ? <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin" /> : <div className="divide-y border-y">
                {filteredProducts.map((product) => { const quantity = quantities[product.id] ?? 0; return (
                  <article key={product.id} className="grid gap-4 py-5 sm:grid-cols-[72px_minmax(0,1fr)_140px] sm:items-center">
                    <div className="h-[72px] w-[72px] overflow-hidden rounded-md bg-muted">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" /> : <Package className="m-5 h-8 w-8 text-muted-foreground" />}</div>
                     <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{product.name}</h2>{product.stock_quantity === 0 && <Badge variant="secondary">Sem estoque</Badge>}</div><p className="mt-1 font-mono text-xs text-muted-foreground">{product.bling_code || "Sem código"}</p><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description || "Sem descrição."}</p><div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><div>{hasOutOfStateDiscount && <span className="mr-2 text-xs text-muted-foreground line-through">{money(Number(product.price_b2b))}</span>}<strong>{selectedClient && !hasClientState ? "Selecione a UF" : money(effectivePrice(product))}</strong></div><span className="text-muted-foreground">Estoque: {product.stock_quantity}</span><Button variant="link" className="h-auto gap-1 p-0" onClick={() => setDetailProduct(product)}><Eye className="h-4 w-4" /> Ver detalhes</Button></div></div>
                    <div className="flex h-10 items-center justify-between rounded-md border"><Button variant="ghost" size="icon" onClick={() => setQuantity(product.id, quantity - 1)} disabled={quantity === 0} aria-label="Diminuir"><Minus className="h-4 w-4" /></Button><Input aria-label={`Quantidade de ${product.name}`} type="number" min="0" max="10000" value={quantity || ""} onChange={(e) => setQuantity(product.id, Number(e.target.value))} className="h-9 w-16 border-0 p-1 text-center focus-visible:ring-0" /><Button variant="ghost" size="icon" onClick={() => setQuantity(product.id, quantity + 1)} aria-label="Aumentar"><Plus className="h-4 w-4" /></Button></div>
                  </article>
                ); })}
              </div>}
            </section>
            <aside className="h-fit border-t-4 border-primary bg-card p-5 shadow-sm xl:sticky xl:top-5">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Novo pedido</h2><Badge>{cartProducts.length}</Badge></div>
              <div className="mt-5 space-y-4">
                 <div className="space-y-2"><Label>Cliente</Label><Select value={selectedClient} onValueChange={setSelectedClient}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.company_name}{client.address_state ? ` · ${client.address_state.toUpperCase()}` : " · UF pendente"}</SelectItem>)}</SelectContent></Select>{clients.length === 0 && <Button variant="link" className="h-auto p-0" onClick={() => setTab("clientes")}>Cadastre o primeiro cliente</Button>}{selectedClient && !hasClientState && <Button variant="link" className="h-auto p-0 text-destructive" onClick={() => { if (selectedClientData) { openClient(selectedClientData); } }}>Preencher estado do cliente</Button>}{hasOutOfStateDiscount && <p className="text-xs font-medium text-primary">14% de desconto aplicado para {selectedClientState}</p>}</div>
                <div className="space-y-2"><Label>Condição de pagamento</Label><Select value={selectedTerm} onValueChange={setSelectedTerm}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{terms.map((term) => <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>)}</SelectContent></Select></div>
                 <div className="max-h-56 space-y-3 overflow-y-auto border-y py-3">{cartProducts.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">Adicione quantidades no catálogo.</p> : cartProducts.map((p) => <div key={p.id} className="flex justify-between gap-3 text-sm"><span>{quantities[p.id]}× {p.name}</span><strong className="shrink-0">{selectedClient && !hasClientState ? "—" : money(effectivePrice(p) * quantities[p.id])}</strong></div>)}</div>
                <div className="flex items-center justify-between text-lg"><span>Total</span><strong>{money(total)}</strong></div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Observações do pedido" />
                 <Button className="w-full" size="lg" onClick={() => createOrder.mutate()} disabled={createOrder.isPending || cartProducts.length === 0 || !selectedClient || !hasClientState}>{createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar para aprovação</Button>
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="mt-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row"><div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Buscar cliente, CNPJ ou inscrição estadual" className="pl-9" /></div><Button onClick={() => openClient()}><Plus className="h-4 w-4" /> Novo cliente</Button></div>
          {clientsLoading ? <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin" /> : filteredClients.length === 0 ? <div className="border-y py-20 text-center"><BookUser className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 font-medium">Nenhum cliente cadastrado</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredClients.map((client) => <article key={client.id} className="rounded-md border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{client.company_name}</h2><p className="mt-1 text-sm text-muted-foreground">{client.contact_name || "Sem contato informado"}</p></div><div className="flex"><Button variant="ghost" size="icon" onClick={() => openClient(client)} aria-label="Editar cliente"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover ${client.company_name}?`)) deleteClient.mutate(client.id); }} aria-label="Remover cliente"><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div><dl className="mt-5 grid gap-2 text-sm"><div><dt className="text-muted-foreground">CNPJ</dt><dd>{client.cnpj ? formatCnpj(client.cnpj) : "Pendente"}</dd></div><div><dt className="text-muted-foreground">Inscrição estadual</dt><dd>{client.state_registration || "Pendente"}</dd></div><div><dt className="text-muted-foreground">Contato</dt><dd>{[client.phone, client.email].filter(Boolean).join(" · ") || "—"}</dd></div><div><dt className="text-muted-foreground">Cidade</dt><dd>{[client.address_city, client.address_state].filter(Boolean).join(" / ") || "—"}</dd></div></dl></article>)}</div>}
        </TabsContent>

        <TabsContent value="pedidos" className="mt-6">
          {ordersLoading ? <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin" /> : orders.length === 0 ? <div className="border-y py-20 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 font-medium">Nenhum pedido enviado</p></div> : <div className="divide-y border-y">{orders.map((order: Order) => { const items = orderItems.filter((item) => item.order_id === order.id); const expanded = expandedOrder === order.id; return <article key={order.id} className="py-5"><button className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setExpandedOrder(expanded ? null : order.id)}><div><p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p><h2 className="mt-1 font-semibold">{clientName(order.client_id)}</h2><p className="mt-1 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")} · {order.payment_term_snapshot}</p></div><div className="flex items-center gap-4"><div className="text-right"><Badge variant={order.status === "recusado" ? "destructive" : order.status === "aprovado" ? "default" : "outline"}>{statusLabel[order.status]}</Badge><p className="mt-2 font-semibold">{money(Number(order.total))}</p></div>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div></button>{expanded && <div className="mt-5 border-t pt-4"><div className="space-y-2">{items.map((item: OrderItem) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.quantity}× {item.product_name} <span className="text-muted-foreground">({item.product_code || "s/c"})</span></span><span>{money(Number(item.line_total))}</span></div>)}</div>{order.notes && <p className="mt-4 text-sm text-muted-foreground">Observações: {order.notes}</p>}</div>}</article>; })}</div>}
        </TabsContent>
      </Tabs>

      <Dialog open={clientOpen} onOpenChange={setClientOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editingClient ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); saveClient.mutate(); }} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Razão social ou nome *</Label><Input value={clientForm.company_name} onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })} maxLength={160} required /></div><div className="space-y-2"><Label>CNPJ *</Label><Input inputMode="numeric" value={clientForm.cnpj} onChange={(e) => setClientForm({ ...clientForm, cnpj: formatCnpj(e.target.value) })} placeholder="00.000.000/0000-00" maxLength={18} required /></div><div className="space-y-2"><Label>Inscrição estadual *</Label><Input value={clientForm.state_registration} onChange={(e) => setClientForm({ ...clientForm, state_registration: e.target.value })} placeholder="Número ou Isento" maxLength={30} required /></div>{([['contact_name','Pessoa de contato'],['phone','Telefone'],['email','E-mail'],['address_zip','CEP'],['address_street','Rua'],['address_number','Número'],['address_complement','Complemento'],['address_neighborhood','Bairro'],['address_city','Cidade']] as const).map(([key,label]) => { const required = key !== "address_complement"; return <div key={key} className={key === "address_street" ? "space-y-2 sm:col-span-2" : "space-y-2"}><Label>{label}{required ? " *" : ""}</Label><Input type={key === "email" ? "email" : "text"} value={clientForm[key]} onChange={(e) => setClientForm({ ...clientForm, [key]: e.target.value })} maxLength={key === "email" ? 255 : 160} required={required} /></div>; })}<div className="space-y-2"><Label>Estado *</Label><Select value={clientForm.address_state} onValueChange={(address_state) => setClientForm({ ...clientForm, address_state })} required><SelectTrigger aria-label="Estado"><SelectValue placeholder="Selecione a UF" /></SelectTrigger><SelectContent>{BRAZILIAN_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent></Select></div></div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setClientOpen(false)}>Cancelar</Button><Button type="submit" disabled={saveClient.isPending}>{saveClient.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button></div></form></DialogContent></Dialog>

      <Dialog open={Boolean(detailProduct)} onOpenChange={(open) => { if (!open) setDetailProduct(null); }}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>{detailProduct?.name}</DialogTitle></DialogHeader>{detailProduct && <div className="grid gap-8 md:grid-cols-2"><div className="min-w-0 rounded-md bg-secondary/40 p-4">{imagesLoading ? <Loader2 className="mx-auto my-24 h-6 w-6 animate-spin" /> : <ProductImageGallery images={productImages} fallbackUrl={detailProduct.image_url} productName={detailProduct.name} showPlekLogo={detailProduct.uses_plek_technology} />}</div><div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{detailProduct.bling_code || "Sem código"}</p><div className="mt-4 flex flex-wrap items-baseline gap-3">{hasOutOfStateDiscount && <span className="text-sm text-muted-foreground line-through">{money(Number(detailProduct.price_b2b))}</span>}<strong className="text-2xl">{selectedClient && !hasClientState ? "Complete a UF do cliente" : money(effectivePrice(detailProduct))}</strong></div>{hasOutOfStateDiscount && <Badge className="mt-2">14% de desconto para {selectedClientState}</Badge>}<p className="mt-3 text-sm text-muted-foreground">Estoque disponível: {detailProduct.stock_quantity}</p><div className="mt-7 border-t pt-6"><h3 className="font-semibold">Descrição completa</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{detailProduct.description || "Sem descrição cadastrada."}</p></div>{detailVideoId && <div className="mt-7 border-t pt-6"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Play className="h-4 w-4" /> Vídeo do produto</h3><div className="aspect-video overflow-hidden rounded-md"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${detailVideoId}`} title={`Vídeo - ${detailProduct.name}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>}</div></div>}</DialogContent></Dialog>
    </main>
  );
}