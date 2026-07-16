import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Link as LinkIcon, CheckCircle2 } from "lucide-react";

const PROJECT_URL = "https://futrahzhqdvqwvuxlbqf.supabase.co";

export function BlingSyncPanel() {
  const qc = useQueryClient();

  const { data: auth, isLoading } = useQuery({
    queryKey: ["bling-auth-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("bling-auth-status");
      if (error) throw error;
      return data as {
        connected: boolean;
        expires_at: string | null;
        last_sync_at: string | null;
        last_sync_summary: any;
      };
    },
    refetchInterval: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("bling-sync-stock");
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha na sincronização");
      return data.summary;
    },
    onSuccess: (s: any) => {
      toast.success(
        `Sincronização concluída: ${s.updated} atualizado(s), ${s.not_found} não encontrado(s), ${s.errors} erro(s).`,
      );
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["bling-auth-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connected = auth?.connected;
  const lastSync = auth?.last_sync_at ? new Date(auth.last_sync_at) : null;

  function connect() {
    window.open(`${PROJECT_URL}/functions/v1/bling-oauth-start`, "_blank", "width=600,height=700");
  }

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      <div className="flex items-center gap-2 min-w-0">
        {connected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        ) : (
          <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium">Sincronização Bling {isLoading ? "…" : connected ? "conectada" : "não conectada"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {connected
              ? lastSync
                ? `Última sincronização: ${lastSync.toLocaleString("pt-BR")} · automática a cada 1h`
                : "Nenhuma sincronização executada ainda · automática a cada 1h"
              : "Conecte para atualizar o estoque dos produtos com Cód. Bling automaticamente."}
          </p>
        </div>
      </div>
      <div className="flex gap-2 md:ml-auto">
        {!connected && (
          <Button variant="outline" onClick={connect}>
            <LinkIcon className="mr-2 h-4 w-4" /> Conectar Bling
          </Button>
        )}
        {connected && (
          <>
            <Button variant="outline" onClick={connect} title="Reautorizar">
              <LinkIcon className="mr-2 h-4 w-4" /> Reconectar
            </Button>
            <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
