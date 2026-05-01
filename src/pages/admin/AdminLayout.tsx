import { Link, Outlet, useLocation } from "react-router-dom";
import { Package, ArrowLeft, Ticket, ShoppingBag, CreditCard, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Produtos", path: "/admin/produtos", icon: Package },
  { label: "Pedidos", path: "/admin/pedidos", icon: ShoppingBag },
  { label: "Pagamentos", path: "/admin/pagamentos", icon: CreditCard },
  { label: "Cupons", path: "/admin/cupons", icon: Ticket },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card">
        <div className="container flex items-center h-14 gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à loja
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <span className="font-heading font-bold text-lg">Painel Admin</span>
          <nav className="ml-8 flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  location.pathname.startsWith(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
}
