"use client";

import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Home, Upload, Database, Users, Check } from "lucide-react";
import { useUserModules } from "@/hooks/useUserModules"; // ✅ Importamos o Hook de Módulos

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
    description: "Visão geral com os cards de atalho e métricas.",
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
    label: "Contagem por Banco de Dados",
    description: "Abrir na tela de contagem usando o catálogo global.",
    icon: Database,
  },
  {
    value: "team",
    label: "Contagem em Equipe",
    description: "Priorizar a experiência de gerenciamento de salas.",
    icon: Users,
  },
];

export function PreferredModeSettings() {
  const { hasModule, isAdmin, loading: modulesLoading } = useUserModules(); // ✅ Puxa as permissões

  const [currentValue, setCurrentValue] = useState<PreferredMode>("dashboard");
  const [initialValue, setInitialValue] = useState<PreferredMode>("dashboard");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // ✅ Filtra as opções baseadas no acesso real do usuário
  const availableOptions = OPTIONS.filter((opt) => {
    if (opt.value === "audit") return isAdmin || hasModule("livre");
    if (opt.value === "team") return isAdmin || hasModule("sala");
    if (opt.value === "count_import") return isAdmin || hasModule("importacao");
    return true; // Dashboard é sempre visível
  });

  useEffect(() => {
    const stored = sessionStorage.getItem(
      "preferredMode",
    ) as PreferredMode | null;

    if (
      stored &&
      ["dashboard", "count_import", "count_scan", "audit", "team"].includes(
        stored,
      )
    ) {
      setCurrentValue(stored);
      setInitialValue(stored);
    } else {
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
          data.error || "Não foi possível salvar a preferência.",
        );
        return;
      }

      if (currentValue === "dashboard") {
        sessionStorage.removeItem("preferredMode");
      } else {
        sessionStorage.setItem("preferredMode", currentValue);
      }

      setInitialValue(currentValue);
      setStatusMessage("Preferência salva com sucesso.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = currentValue !== initialValue;

  if (modulesLoading) {
    return <div className="animate-pulse h-32 bg-muted/20 rounded-xl" />;
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
          Página inicial preferida
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Configure qual tela deve ser carregada automaticamente ao realizar o
          login no sistema.
        </p>
      </div>

      <RadioGroup
        value={currentValue}
        onValueChange={(v) => setCurrentValue(v as PreferredMode)}
        className="grid grid-cols-1 gap-3"
      >
        {/* ✅ Renderiza apenas as opções que o usuário tem acesso */}
        {availableOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = currentValue === opt.value;

          return (
            <Label
              key={opt.value}
              htmlFor={opt.value}
              className={`
                relative flex items-start justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200
                ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                }
              `}
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div
                  className={`
                    rounded-lg p-2.5 transition-colors shrink-0
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-secondary-foreground"
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex flex-col gap-1 min-w-0 pt-0.5">
                  <span
                    className={`font-medium text-sm leading-snug ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-relaxed hidden sm:block">
                    {opt.description}
                  </span>
                </div>
              </div>

              <RadioGroupItem
                value={opt.value}
                id={opt.value}
                className="mt-1 hidden"
              />

              <div
                className={`
                flex h-6 w-6 items-center justify-center rounded-full border transition-all shrink-0 mt-1
                ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background"
                }
              `}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border/40">
        <div className="text-xs">
          {statusMessage ? (
            <span
              className={`flex items-center gap-1.5 font-medium ${
                statusMessage.includes("Erro")
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-500"
              }`}
            >
              {statusMessage.includes("Erro") ? (
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
              {statusMessage}
            </span>
          ) : (
            <span className="text-muted-foreground">
              As alterações são salvas individualmente.
            </span>
          )}
        </div>

        <Button
          size="default"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
          className="w-full sm:w-auto h-10 px-6 shadow-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </div>
    </div>
  );
}
