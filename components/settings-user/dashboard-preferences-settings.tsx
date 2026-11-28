"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardPreferencesSettingsProps {
  initialFixarPlanejador?: boolean;
}

export function DashboardPreferencesSettings({
  initialFixarPlanejador,
}: DashboardPreferencesSettingsProps = {}) {
  const { toast } = useToast();
  const hasInitial = initialFixarPlanejador !== undefined;

  const [fixarPlanejador, setFixarPlanejador] = useState(
    initialFixarPlanejador ?? true,
  );
  const [loading, setLoading] = useState(!hasInitial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hasInitial) return;

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
  }, [hasInitial]);

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
          ? "O planejador rotativo será exibido por padrão na tela inicial."
          : "O planejador rotativo ficará recolhido para priorizar os gráficos.",
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
    <section
      id="dashboard"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 py-6 lg:py-8"
    >
      <div className="lg:col-span-4 min-w-0 space-y-1">
        <h2
          id="settings-dashboard-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Controle os painéis exibidos na tela inicial do sistema.
        </p>
      </div>

      <div className="lg:col-span-8 min-w-0">
        <div
          aria-labelledby="settings-dashboard-heading"
          className="rounded-xl border border-border/60 bg-card p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <Label
                htmlFor="toggle-fixar-planejador"
                className="text-sm font-medium leading-snug cursor-pointer text-foreground block"
              >
                Fixar planejador de inventário rotativo
              </Label>
              <p
                id="planner-pin-hint"
                className="text-xs text-muted-foreground leading-relaxed"
              >
                Exibe o quadro de planejamento no topo do Dashboard. Quando
                desativado, libera mais espaço para os gráficos.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                id="toggle-fixar-planejador"
                aria-describedby="planner-pin-hint"
                checked={fixarPlanejador}
                disabled={loading || saving}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
