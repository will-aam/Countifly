"use client";

import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Home, Upload, Database, Users } from "lucide-react";

type PreferredMode =
  | "dashboard"
  | "count_import"
  | "count_scan"
  | "audit"
  | "team";

const OPTIONS: {
  value: PreferredMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "dashboard",
    label: "Dashboard Principal",
    description: "Sempre abrir na visão geral com os cards de atalho.",
    icon: Home,
  },
  {
    value: "count_import",
    label: "Contagem por Importação",
    description: "Abrir diretamente na tela de Conferência/Importar/Exportar.",
    icon: Upload,
  },
  {
    value: "audit",
    label: "Contagem Livre (Catálogo Global)",
    description: "Abrir na tela de contagem usando o catálogo global.",
    icon: Database,
  },
  {
    value: "team",
    label: "Modo Equipe",
    description: "Priorizar a experiência de gerenciamento de salas.",
    icon: Users,
  },
];

export function PreferredModeSettings() {
  const [currentValue, setCurrentValue] = useState<PreferredMode>("dashboard");
  const [initialValue, setInitialValue] = useState<PreferredMode>("dashboard");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Carrega o valor inicial do sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(
      "preferredMode"
    ) as PreferredMode | null;

    if (
      stored &&
      ["dashboard", "count_import", "count_scan", "audit", "team"].includes(
        stored
      )
    ) {
      setCurrentValue(stored);
      setInitialValue(stored);
    } else {
      // se não tiver nada salvo, consideramos "dashboard"
      setCurrentValue("dashboard");
      setInitialValue("dashboard");
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/user/preferred-mode", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferredMode: currentValue === "dashboard" ? null : currentValue,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusMessage(
          data.error || "Não foi possível salvar a preferência."
        );
        return;
      }

      // Atualiza sessão local:
      if (currentValue === "dashboard") {
        sessionStorage.removeItem("preferredMode");
      } else {
        sessionStorage.setItem("preferredMode", currentValue);
      }

      setInitialValue(currentValue);
      setStatusMessage("Preferência de página inicial atualizada.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = currentValue !== initialValue;

  return (
    <div className="space-y-3 rounded-lg border bg-card/50 p-4">
      <div>
        <h2 className="text-sm font-semibold">Página inicial preferida</h2>
        <p className="text-xs text-muted-foreground">
          Escolha qual tela será aberta automaticamente após o login.
        </p>
      </div>

      <RadioGroup
        value={currentValue}
        onValueChange={(v) => setCurrentValue(v as PreferredMode)}
        className="space-y-2"
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Label
              key={opt.value}
              htmlFor={opt.value}
              className="flex items-start gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2 text-xs cursor-pointer hover:bg-accent/40 hover:border-border transition-colors"
            >
              <RadioGroupItem
                value={opt.value}
                id={opt.value}
                className="mt-1"
              />
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-primary/80">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-[13px] leading-tight">
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {opt.description}
                  </p>
                </div>
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-muted-foreground">
          {statusMessage && (
            <span className="text-foreground">{statusMessage}</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
          className="h-8 text-xs px-3"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar preferência"
          )}
        </Button>
      </div>
    </div>
  );
}
