import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function B2BRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: account, isLoading } = useQuery({
    queryKey: ["b2b-access", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("b2b_accounts")
        .select("id, company_name, status, account_type")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || (user && isLoading)) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to={`/b2b/entrar?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (!account || account.account_type !== "representante" || account.status !== "aprovado") {
    return <Navigate to="/b2b/entrar" replace />;
  }
  return <>{children}</>;
}