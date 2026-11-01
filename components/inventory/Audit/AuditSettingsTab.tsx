"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  Download,
  Loader2,
  Trash2,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  AUDIT_PROFILES,
  configForAuditProfile,
  getAuditProfileLabel,
  type AuditConfig,
  type AuditProfileId,
} from "@/lib/audit";
import {
  clearGlobalCatalogOffline,
  getGlobalCatalogOfflineCount,
  saveGlobalCatalogOffline,
} from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

export type { AuditConfig } from "@/lib/audit";

interface AuditSettingsTabProps {
  config: AuditConfig;
  setConfig: (config: AuditConfig) => void;
  userId: number | null;
  profileLocked?: boolean;
}

interface CatalogOptions {
  categories: string[];
  subcategories: string[];
  brands: string[];
}

const PAGE_SIZE = 500;

function CatalogFilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || "__all__"}
        onValueChange={(nextValue) =>
          onChange(nextValue === "__all__" ? "" : nextValue)
        }
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={`Todas as ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AuditSettingsTab({
  config,
  setConfig,
  userId,
  profileLocked = false,
}: AuditSettingsTabProps) {
  const { toast } = useToast();
  const [objectiveExpanded, setObjectiveExpanded] = useState(false);
  const [offlineOptionsExpanded, setOfflineOptionsExpanded] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState<CatalogOptions>({
    categories: [],
    subcategories: [],
    brands: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [offlineProductCount, setOfflineProductCount] = useState(0);
  const [confirmClearOffline, setConfirmClearOffline] = useState(false);

  const filters = config.offlineFilters || {
    category: "",
    subcategory: "",
    brand: "",
  };
  const hasFilter = Boolean(filters.category || filters.subcategory || filters.brand);
  const selectedFiltersLabel = useMemo(
    () => [filters.category, filters.subcategory, filters.brand].filter(Boolean).join(" · "),
    [filters.category, filters.subcategory, filters.brand],
  );
  const activeFiltersLabel = useMemo(
    () => config.offlineActiveFilters
      ? [
          config.offlineActiveFilters.category,
          config.offlineActiveFilters.subcategory,
          config.offlineActiveFilters.brand,
        ].filter(Boolean).join(" · ")
      : "",
    [config.offlineActiveFilters],
  );

  useEffect(() => {
    if (!userId) return;
    getGlobalCatalogOfflineCount(userId)
      .then(setOfflineProductCount)
      .catch((error) => console.error("Erro ao consultar catálogo offline:", error));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setOptionsLoading(true);
    fetch("/api/global-catalog/options")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar o catálogo.");
        if (!cancelled) {
          setCatalogOptions({
            categories: data.categories || [],
            subcategories: data.subcategories || [],
            brands: data.brands || [],
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast({
            title: "Catálogo global indisponível",
            description: error instanceof Error ? error.message : "Tente novamente.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, toast]);

  const updateProfile = (profile: AuditProfileId) => {
    setConfig(configForAuditProfile(profile, config));
  };

  const updateOfflineFilter = (
    key: "category" | "subcategory" | "brand",
    value: string,
  ) => {
    setConfig({
      ...config,
      offlineFilters: { ...filters, [key]: value },
    });
  };

  const downloadSelectedCatalog = async () => {
    if (!userId || !hasFilter || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadTotal(0);
    let page = 0;
    let total = 0;
    let downloadedThisRun = 0;

    try {
      while (true) {
        const params = new URLSearchParams({ page: String(page) });
        if (filters.category) params.set("category", filters.category);
        if (filters.subcategory) params.set("subcategory", filters.subcategory);
        if (filters.brand) params.set("brand", filters.brand);

        const response = await fetch(`/api/global-catalog/download?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível baixar esta seleção.");

        total = Number(data.total || 0);
        setDownloadTotal(total);
        const items = data.items || [];
        if (items.length > 0) {
          await saveGlobalCatalogOffline(userId, items);
          downloadedThisRun += items.length;
          setDownloadProgress(Math.min(downloadedThisRun, total));
        }
        if (!data.hasMore || items.length === 0) break;
        page += 1;
      }

      const totalCached = await getGlobalCatalogOfflineCount(userId);
      setOfflineProductCount(totalCached);
      if (total === 0) {
        toast({ title: "Nenhum produto encontrado", description: "Revise os filtros selecionados." });
      } else {
        setConfig({
          ...config,
          offlineMode: true,
          offlineActiveFilters: { ...filters },
        });
        toast({
          title: "Catálogo salvo para uso offline",
          description: `${selectedFiltersLabel}. ${totalCached.toLocaleString("pt-BR")} produtos disponíveis offline neste aparelho.`,
        });
      }
    } catch (error) {
      getGlobalCatalogOfflineCount(userId).then(setOfflineProductCount).catch(() => {});
      toast({
        title: "Não foi possível concluir o download",
        description: error instanceof Error ? error.message : "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const clearOfflineCatalog = async () => {
    if (!userId) return;
    try {
      await clearGlobalCatalogOffline(userId);
      setOfflineProductCount(0);
      setConfig({ ...config, offlineMode: false, offlineActiveFilters: null });
      setConfirmClearOffline(false);
      toast({ title: "Catálogo offline removido deste aparelho" });
    } catch (error) {
      toast({
        title: "Não foi possível remover o catálogo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {config.collectQuantity && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Formato da quantidade</CardTitle>
            <CardDescription>Escolha como a equipe vai separar os números.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 pt-0 sm:grid-cols-2">
            {([
              ["total", "Quantidade total"],
              ["split", "Loja e estoque"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={config.quantityLayout === value}
                disabled={profileLocked}
                onClick={() => setConfig({ ...config, quantityLayout: value })}
                className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                  config.quantityLayout === value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/60"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex items-center gap-2 pt-2 sm:col-span-2">
              <Switch
                id="direct-scan"
                checked={config.directScan}
                onCheckedChange={(checked) => setConfig({ ...config, directScan: checked })}
              />
              <Label htmlFor="direct-scan">Somar 1 automaticamente ao bipar</Label>
              {config.directScan && (
                <Badge variant="secondary" className="ml-auto gap-1">
                  <Zap className="h-3 w-3" /> Ativada
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={objectiveExpanded}
            onClick={() => setObjectiveExpanded((expanded) => !expanded)}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Objetivo do levantamento</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Perfil atual: {getAuditProfileLabel(config.profile)}
                {profileLocked ? " · fixado nesta contagem" : " · toque para alterar"}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${objectiveExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </CardHeader>
        {objectiveExpanded && (
          <CardContent className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
            {AUDIT_PROFILES.map((profile) => {
              const selected = config.profile === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={profileLocked}
                  onClick={() => updateProfile(profile.id)}
                  className={`min-h-20 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <span className="block font-medium">{profile.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {profile.description}
                  </span>
                </button>
              );
            })}
            {profileLocked && (
              <p className="text-sm text-amber-700 sm:col-span-2 dark:text-amber-300">
                O perfil fica fixo depois do primeiro item. Inicie uma nova contagem para escolher outro.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm">Base global</CardTitle>
              <CardDescription className="mt-1">
                Baixe um recorte para conferir produtos sem consulta online.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {offlineProductCount.toLocaleString("pt-BR")} itens
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-start gap-3">
            <Switch
              id="offline-mode"
              checked={config.offlineMode}
              onCheckedChange={(checked) => setConfig({ ...config, offlineMode: checked })}
              disabled={downloading || profileLocked || (!config.offlineMode && (!config.offlineActiveFilters || offlineProductCount === 0))}
            />
            <div className="grid gap-1">
              <Label htmlFor="offline-mode">Contar somente com a base offline ativa</Label>
              <p className="text-sm text-muted-foreground">
                {config.offlineMode
                  ? `Ativo: códigos fora de “${activeFiltersLabel || "a base baixada"}” viram itens novos, sem busca online.`
                  : "Desativado: a contagem consulta o catálogo global pela internet."}
              </p>
              {config.offlineMode && profileLocked && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  A base fica fixa durante esta contagem. Limpe ou inicie outra para trocá-la.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={offlineOptionsExpanded}
            onClick={() => setOfflineOptionsExpanded((expanded) => !expanded)}
          >
            <span>{offlineOptionsExpanded ? "Ocultar gerenciamento da base" : "Baixar ou gerenciar base offline"}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${offlineOptionsExpanded ? "rotate-180" : ""}`} />
          </button>
          {offlineOptionsExpanded && <div className="space-y-4 rounded-lg border p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid gap-1">
                  <p className="text-sm font-medium">Selecionar base para baixar</p>
                  <p className="text-xs text-muted-foreground">Você pode escolher um filtro ou combinar os três.</p>
                </div>
                {config.offlineMode && (
                  <Badge variant="secondary" className="max-w-full truncate">
                    Base ativa: {activeFiltersLabel || "seleção offline"}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <CatalogFilterSelect
                  id="offline-category"
                  label="Categoria"
                  value={filters.category}
                  options={catalogOptions.categories}
                  onChange={(value) => updateOfflineFilter("category", value)}
                  disabled={optionsLoading || downloading || profileLocked}
                />
                <CatalogFilterSelect
                  id="offline-subcategory"
                  label="Subcategoria"
                  value={filters.subcategory}
                  options={catalogOptions.subcategories}
                  onChange={(value) => updateOfflineFilter("subcategory", value)}
                  disabled={optionsLoading || downloading || profileLocked}
                />
                <CatalogFilterSelect
                  id="offline-brand"
                  label="Marca"
                  value={filters.brand}
                  options={catalogOptions.brands}
                  onChange={(value) => updateOfflineFilter("brand", value)}
                  disabled={optionsLoading || downloading || profileLocked}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Escolha pelo menos um filtro. Quando combinar filtros, o download incluirá produtos que correspondam a todos eles.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={downloadSelectedCatalog}
                  disabled={!hasFilter || !userId || optionsLoading || downloading || profileLocked}
                  className="w-full sm:w-auto"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading
                    ? `Baixando ${downloadProgress.toLocaleString("pt-BR")} / ${downloadTotal.toLocaleString("pt-BR")}`
                    : "Baixar seleção"}
                </Button>
                {optionsLoading && (
                  <span className="text-xs text-muted-foreground">Carregando filtros do catálogo…</span>
                )}
              </div>

              {profileLocked && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  A base offline não pode ser alterada depois que a contagem começa.
                </p>
              )}

              <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                <Badge variant="secondary" className="w-fit gap-1.5">
                  <WifiOff className="h-3.5 w-3.5" />
                  {offlineProductCount.toLocaleString("pt-BR")} produtos neste aparelho
                </Badge>
                {offlineProductCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground sm:w-auto"
                    onClick={() => setConfirmClearOffline(true)}
                    disabled={downloading || profileLocked}
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar catálogo offline
                  </Button>
                )}
              </div>
          </div>}
        </CardContent>
      </Card>

      <AlertDialog open={confirmClearOffline} onOpenChange={setConfirmClearOffline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produtos baixados?</AlertDialogTitle>
            <AlertDialogDescription>
              O catálogo offline será removido deste aparelho. As contagens já feitas não serão alteradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void clearOfflineCatalog()}
            >
              Remover catálogo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
