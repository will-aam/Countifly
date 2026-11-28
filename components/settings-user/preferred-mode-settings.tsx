"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Home,
  Upload,
  Database,
  Users,
  Check,
  LayoutGrid,
} from "lucide-react";
import { useUserModules } from "@/hooks/useUserModules";
import { cn } from "@/lib/utils";

type PreferredMode =
  | "dashboard"
  | "count_import"
  | "count_scan"
  | "audit"
  | "team"
  | "modular";

const VALID_MODES: readonly PreferredMode[] = [
  "dashboard",
  "count_import",
  "count_scan",
  "audit",
  "team",
  "modular",
];

const OPTIONS: {
  value: PreferredMode;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "dashboard",
    label: "Dashboard Principal",
    description: "Visão geral com atalhos e métricas.",
    icon: Home,
  },
  {
    value: "count_import",
    label: "Planilha ERP (CSV)",
    description: "Abrir direto na contagem por planilha.",
    icon: Upload,
  },
  {
    value: "audit",
    label: "Contagem Livre (Avulsa)",
    description: "Iniciar contagem usando o catálogo global.",
    icon: Database,
  },
  {
    value: "team",
    label: "Sessão em Equipe",
    description: "Ir para o gerenciamento de salas.",
    icon: Users,
  },
  {
    value: "modular",
    label: "Contagem Modular",
    description: "Modo configurável por validade, lote e local.",
    icon: LayoutGrid,
  },
];

interface PreferredModeSettingsProps {
  initialPreferredMode?: string | null;
  availableModules?: {
    importacao: boolean;
    livre: boolean;
    sala: boolean;
    modular: boolean;
  };
  isAdmin?: boolean;
}

function normalizePreferredMode(
  value: string | null | undefined,
): PreferredMode {
  if (value && VALID_MODES.includes(value as PreferredMode)) {
    return value as PreferredMode;
  }
  return "dashboard";
}

export function PreferredModeSettings({
  initialPreferredMode,
  availableModules,
  isAdmin: isAdminProp,
}: PreferredModeSettingsProps = {}) {
  const {
    hasModule: hookHasModule,
    isAdmin: hookIsAdmin,
    loading: hookModulesLoading,
  } = useUserModules();

  const hasServerModules = availableModules !== undefined;
  const effectiveIsAdmin = isAdminProp ?? hookIsAdmin;
  const modulesLoading = hasServerModules ? false : hookModulesLoading;

  const canAccessModule = (
    moduleKey: "importacao" | "livre" | "sala" | "modular",
  ) => {
    if (effectiveIsAdmin) return true;
    if (availableModules) return availableModules[moduleKey] === true;
    return hookHasModule(moduleKey);
  };

  const resolvedInitial = normalizePreferredMode(initialPreferredMode);
  const [currentValue, setCurrentValue] =
    useState<PreferredMode>(resolvedInitial);
  const [initialValue, setInitialValue] =
    useState<PreferredMode>(resolvedInitial);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const availableOptions = OPTIONS.filter((opt) => {
    if (opt.value === "audit") return canAccessModule("livre");
    if (opt.value === "team") return canAccessModule("sala");
    if (opt.value === "count_import") return canAccessModule("importacao");
    if (opt.value === "modular") return canAccessModule("modular");
    return true;
  });

  useEffect(() => {
    if (initialPreferredMode !== undefined) {
      const normalized = normalizePreferredMode(initialPreferredMode);
      setCurrentValue(normalized);
      setInitialValue(normalized);
      if (normalized === "dashboard") {
        sessionStorage.removeItem("preferredMode");
      } else {
        sessionStorage.setItem("preferredMode", normalized);
      }
      return;
    }

    const stored = sessionStorage.getItem("preferredMode");
    const normalized = normalizePreferredMode(stored);
    setCurrentValue(normalized);
    setInitialValue(normalized);
  }, [initialPreferredMode]);

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasChanges || isSaving) return;

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

  return (
    <section
      id="pagina-inicial"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 py-6 lg:py-8"
    >
      <div className="lg:col-span-4 min-w-0 space-y-1">
        <h2
          id="settings-startpage-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Página inicial
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Escolha qual tela será aberta automaticamente após realizar o login.
        </p>
      </div>

      <div className="lg:col-span-8 min-w-0">
        {modulesLoading ? (
          <div className="animate-pulse h-44 bg-muted/20 rounded-xl border border-border/60" />
        ) : (
          <form
            onSubmit={handleSave}
            aria-labelledby="settings-startpage-heading"
            className="rounded-xl border border-border/60 bg-card overflow-hidden"
          >
            <fieldset className="p-5 sm:p-6">
              <legend className="sr-only">Página inicial preferida</legend>
              <RadioGroup
                value={currentValue}
                onValueChange={(v) => {
                  setCurrentValue(v as PreferredMode);
                  if (statusMessage) setStatusMessage(null);
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {availableOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = currentValue === opt.value;
                  const inputId = `pref-${opt.value}`;

                  return (
                    <Label
                      key={opt.value}
                      htmlFor={inputId}
                      className={cn(
                        "relative flex items-start justify-between gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/70 bg-background/40 hover:border-border hover:bg-accent/40",
                      )}
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={inputId}
                        className="sr-only"
                      />

                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 mt-0.5 shrink-0 transition-colors",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span
                            className={cn(
                              "font-medium text-sm leading-snug",
                              isSelected ? "text-primary" : "text-foreground",
                            )}
                          >
                            {opt.label}
                          </span>
                          <span className="text-xs text-muted-foreground leading-snug">
                            {opt.description}
                          </span>
                        </div>
                      </div>

                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border transition-colors shrink-0 mt-0.5",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background",
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </fieldset>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-3.5 bg-muted/30 border-t border-border/60">
              <div className="text-xs min-h-4 flex items-center">
                <span
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "font-medium",
                    statusMessage?.includes("Erro") ||
                      statusMessage?.includes("Não")
                      ? "text-destructive"
                      : statusMessage
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground font-normal",
                  )}
                >
                  {statusMessage ||
                    (hasChanges
                      ? "Há alterações não salvas."
                      : "Preferência sincronizada com sua conta.")}
                </span>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={!hasChanges || isSaving}
                className="w-full sm:w-auto min-h-10 px-5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar preferência"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
