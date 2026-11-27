"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DashboardPreferencesSettings() {
  const { toast } = useToast();
  const [fixarPlanejador, setFixarPlanejador] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPreference() {
      try {
        const res = await fetch("/api/user/planner-pin");
        if (res.ok) {
          const data = await res.json();
          if (typeof data.fixarPlanejador === "boolean") {
            setFixarPlanejador(data.fixarPlanejador);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar preferência do planejador:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPreference();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setFixarPlanejador(checked);
    setSaving(true);

    try {
      const res = await fetch("/api/user/planner-pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixarPlanejador: checked }),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar");
      }

      toast({
        title: checked
          ? "Planejador fixado no Dashboard"
          : "Planejador desafixado do Dashboard",
        description: checked
          ? "O planejador rotativo agora será exibido por padrão na sua conta."
          : "O planejador rotativo ficará recolhido na tela inicial para otimizar espaço.",
      });
    } catch {
      setFixarPlanejador(!checked);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar preferência",
        description: "Não foi possível salvar a alteração na sua conta.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Visualização do Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize quais módulos e painéis ficam fixados na sua visão geral.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-xs transition-colors">
        <div className="flex items-start gap-3.5 pr-4">
          <div className="p-2.5 rounded-lg bg-secondary/50 text-secondary-foreground shrink-0 mt-0.5">
            <Pin className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="toggle-fixar-planejador"
              className="text-sm font-medium leading-none cursor-pointer text-foreground"
            >
              Fixar Planejador de Inventário Rotativo
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Exibe o quadro de planejamento de inventário com tripla conferência no topo do
              Dashboard. Se desativado, o quadro fica recolhido para maximizar a área útil dos
              gráficos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="toggle-fixar-planejador"
            checked={fixarPlanejador}
            disabled={loading || saving}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>
    </div>
  );
}
