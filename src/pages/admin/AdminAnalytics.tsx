import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Users, ShoppingCart, CreditCard, TrendingUp, Package } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const RANGES = [
  { label: "Últimos 7 dias", value: 7 },
  { label: "Últimos 30 dias", value: 30 },
  { label: "Últimos 90 dias", value: 90 },
];

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export default function AdminAnalytics() {
  const [days, setDays] = useState<number>(30);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [days]);

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["admin-analytics-events", days],
    queryFn: async () => {
      // PostgREST caps a single response at 1000 rows; paginate to get all events.
      const pageSize = 1000;
      const all: any[] = [];
      let from = 0;
      // Safety cap to avoid runaway loops (max 100k rows).
      for (let i = 0; i < 100; i++) {
        const { data, error } = await supabase
          .from("page_views")
          .select("id, created_at, event_type, path, session_id, product_id")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-analytics-orders", days],
    queryFn: async () => {
      const pageSize = 1000;
      const all: any[] = [];
      let from = 0;
      for (let i = 0; i < 100; i++) {
        const { data, error } = await supabase
          .from("orders")
          .select("id, created_at, status, total")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-analytics-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    (products ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [products]);

  // Aggregations
  const stats = useMemo(() => {
    const evs = events ?? [];
    const ords = orders ?? [];

    const pageViews = evs.filter((e) => e.event_type === "page_view").length;
    const productViews = evs.filter((e) => e.event_type === "product_view").length;
    const addToCart = evs.filter((e) => e.event_type === "add_to_cart").length;
    const uniqueSessions = new Set(evs.map((e) => e.session_id).filter(Boolean)).size;
    const beginCheckout = evs.filter((e) => e.path?.startsWith("/checkout")).length;

    const paidOrders = ords.filter((o) => ["paid", "partial_paid", "processing", "shipped", "delivered"].includes(o.status as string));
    const revenue = paidOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const avgTicket = paidOrders.length ? revenue / paidOrders.length : 0;

    return {
      pageViews,
      productViews,
      addToCart,
      uniqueSessions,
      beginCheckout,
      revenue,
      avgTicket,
      totalOrders: ords.length,
      paidOrders: paidOrders.length,
      conversion: uniqueSessions ? (paidOrders.length / uniqueSessions) * 100 : 0,
    };
  }, [events, orders]);

  // Time series
  const series = useMemo(() => {
    const buckets = new Map<string, { date: string; visits: number; orders: number; revenue: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, visits: 0, orders: 0, revenue: 0 });
    }
    (events ?? []).forEach((e) => {
      if (e.event_type !== "page_view") return;
      const key = e.created_at.slice(0, 10);
      const b = buckets.get(key);
      if (b) b.visits += 1;
    });
    (orders ?? []).forEach((o) => {
      const key = o.created_at.slice(0, 10);
      const b = buckets.get(key);
      if (!b) return;
      b.orders += 1;
      if (["paid", "partial_paid", "processing", "shipped", "delivered"].includes(o.status as string)) {
        b.revenue += Number(o.total || 0);
      }
    });
    return Array.from(buckets.values());
  }, [events, orders, days]);

  // Top pages
  const topPages = useMemo(() => {
    const m = new Map<string, number>();
    (events ?? []).forEach((e) => {
      if (e.event_type !== "page_view") return;
      const p = (e.path || "/").split("?")[0];
      m.set(p, (m.get(p) ?? 0) + 1);
    });
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));
  }, [events]);

  // Top products
  const topProducts = useMemo(() => {
    const views = new Map<string, number>();
    const adds = new Map<string, number>();
    (events ?? []).forEach((e) => {
      if (!e.product_id) return;
      if (e.event_type === "product_view") views.set(e.product_id, (views.get(e.product_id) ?? 0) + 1);
      if (e.event_type === "add_to_cart") adds.set(e.product_id, (adds.get(e.product_id) ?? 0) + 1);
    });
    const ids = new Set([...views.keys(), ...adds.keys()]);
    return Array.from(ids)
      .map((id) => ({
        id,
        name: productMap.get(id) ?? "Produto removido",
        views: views.get(id) ?? 0,
        adds: adds.get(id) ?? 0,
        rate: views.get(id) ? ((adds.get(id) ?? 0) / (views.get(id) ?? 1)) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [events, productMap]);

  const loading = loadingEvents || loadingOrders;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Desempenho do site e vendas</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={String(r.value)}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Eye} label="Visitas" value={loading ? "—" : stats.pageViews.toLocaleString("pt-BR")} />
        <KpiCard icon={Users} label="Visitantes únicos" value={loading ? "—" : stats.uniqueSessions.toLocaleString("pt-BR")} />
        <KpiCard icon={Package} label="Vis. de produto" value={loading ? "—" : stats.productViews.toLocaleString("pt-BR")} />
        <KpiCard icon={ShoppingCart} label="Adições ao carrinho" value={loading ? "—" : stats.addToCart.toLocaleString("pt-BR")} />
        <KpiCard icon={CreditCard} label="Pedidos" value={loading ? "—" : stats.totalOrders.toLocaleString("pt-BR")} sub={`${stats.paidOrders} pagos`} />
        <KpiCard icon={TrendingUp} label="Receita" value={loading ? "—" : formatBRL(stats.revenue)} />
        <KpiCard icon={TrendingUp} label="Ticket médio" value={loading ? "—" : formatBRL(stats.avgTicket)} />
        <KpiCard icon={TrendingUp} label="Conversão" value={loading ? "—" : `${stats.conversion.toFixed(2)}%`} sub="pedidos pagos / visitantes" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visitas por dia</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip labelFormatter={(l) => formatDate(String(l))} />
                  <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por dia</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip labelFormatter={(l) => formatDate(String(l))} formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de conversão</CardTitle>
          <CardDescription>Do tráfego até o pedido pago</CardDescription>
        </CardHeader>
        <CardContent>
          <FunnelRow label="Visitantes únicos" value={stats.uniqueSessions} max={stats.uniqueSessions} />
          <FunnelRow label="Visualizações de produto" value={stats.productViews} max={stats.uniqueSessions} />
          <FunnelRow label="Adições ao carrinho" value={stats.addToCart} max={stats.uniqueSessions} />
          <FunnelRow label="Iniciaram checkout" value={stats.beginCheckout} max={stats.uniqueSessions} />
          <FunnelRow label="Pedidos pagos" value={stats.paidOrders} max={stats.uniqueSessions} />
        </CardContent>
      </Card>

      {/* Top pages + products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Páginas mais visitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Sem dados ainda</TableCell></TableRow>
                )}
                {topPages.map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-mono text-xs">{p.path}</TableCell>
                    <TableCell className="text-right">{p.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos mais vistos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Vis.</TableHead>
                  <TableHead className="text-right">Carrinho</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem dados ainda</TableCell></TableRow>
                )}
                {topProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell className="text-right">{p.views}</TableCell>
                    <TableCell className="text-right">{p.adds}</TableCell>
                    <TableCell className="text-right">{p.rate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">
          {value.toLocaleString("pt-BR")} <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
