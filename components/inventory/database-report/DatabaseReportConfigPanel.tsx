// components/inventory/database-report/DatabaseReportConfigPanel.tsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Layers, Minus, Plus, Info, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { DatabaseReportConfig } from "./types";

interface DatabaseReportConfigPanelProps {
  config: DatabaseReportConfig;
  setConfig: (config: DatabaseReportConfig) => void;
  availableCategories: string[];
  availableSubcategories: string[];
}

export const DatabaseReportConfigPanel: React.FC<
  DatabaseReportConfigPanelProps
> = ({ config, setConfig, availableCategories, availableSubcategories }) => {
  // Função genérica para updates simples
  const updateConfig = (key: keyof DatabaseReportConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleTruncateChange = (newValue: number) => {
    if (newValue >= 10 && newValue <= 100) {
      updateConfig("truncateLimit", newValue);
    }
  };

  // --- LÓGICA DE AGRUPAMENTO ---
  const handleGroupToggle = (
    type: "category" | "subcategory",
    isChecked: boolean,
  ) => {
    const newConfig = { ...config };

    if (type === "category") {
      newConfig.groupByCategory = isChecked;
      if (isChecked) {
        newConfig.groupBySubcategory = false;
        newConfig.showSubCategoryTotals = false;
        newConfig.showOnlySubcategorySummary = false; // Reset modo resumo do outro

        // Auto-selecionar todas ao ativar se estiver vazio
        if (
          !newConfig.selectedCategories ||
          newConfig.selectedCategories.length === 0
        ) {
          newConfig.selectedCategories = availableCategories;
        }
      } else {
        newConfig.showCategoryTotals = false;
        newConfig.showOnlyCategorySummary = false; // Desativa resumo ao desativar grupo
      }
    } else if (type === "subcategory") {
      newConfig.groupBySubcategory = isChecked;
      if (isChecked) {
        newConfig.groupByCategory = false;
        newConfig.showCategoryTotals = false;
        newConfig.showOnlyCategorySummary = false; // Reset modo resumo do outro

        // Auto-selecionar todas ao ativar se estiver vazio
        if (
          !newConfig.selectedSubcategories ||
          newConfig.selectedSubcategories.length === 0
        ) {
          newConfig.selectedSubcategories = availableSubcategories;
        }
      } else {
        newConfig.showSubCategoryTotals = false;
        newConfig.showOnlySubcategorySummary = false; // Desativa resumo
      }
    }
    setConfig(newConfig);
  };

  // --- LÓGICA DE FILTRO (EXCEL STYLE) ---
  const handleFilterChange = (
    type: "category" | "subcategory",
    value: string,
    checked: boolean,
  ) => {
    const key =
      type === "category" ? "selectedCategories" : "selectedSubcategories";
    const currentList = config[key] || [];
    let newList: string[];

    if (value === "ALL") {
      if (checked) {
        newList =
          type === "category" ? availableCategories : availableSubcategories;
      } else {
        newList = [];
      }
    } else {
      if (checked) {
        newList = [...currentList, value];
      } else {
        newList = currentList.filter((item) => item !== value);
      }
    }
    updateConfig(key, newList);
  };

  const isAllSelected = (type: "category" | "subcategory") => {
    const selected =
      type === "category"
        ? config.selectedCategories
        : config.selectedSubcategories;
    const available =
      type === "category" ? availableCategories : availableSubcategories;
    return selected?.length === available?.length;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* --- Grupo 1: Resumo (Cards) --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            Resumo (Cards)
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center"
                >
                  <Info className="w-4 h-4 text-blue-500 ml-1" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-xs text-xs">
                  Ative ou desative os cartões de resumo.
                </p>
              </TooltipContent>
            </Tooltip>
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cardSku" className="cursor-pointer">
                Total de SKUs
              </Label>
              <Switch
                id="cardSku"
                checked={config.showCardSku}
                onCheckedChange={(c) => updateConfig("showCardSku", c)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cardVolume" className="cursor-pointer">
                Volume de Peças
              </Label>
              <Switch
                id="cardVolume"
                checked={config.showCardVolume}
                onCheckedChange={(c) => updateConfig("showCardVolume", c)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cardTicket" className="cursor-pointer">
                Ticket Médio
              </Label>
              <Switch
                id="cardTicket"
                checked={config.showCardTicket}
                onCheckedChange={(c) => updateConfig("showCardTicket", c)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="cardTotalValue"
                className="cursor-pointer font-bold text-blue-700"
              >
                Patrimônio Total
              </Label>
              <Switch
                id="cardTotalValue"
                checked={config.showCardTotalValue}
                onCheckedChange={(c) => updateConfig("showCardTotalValue", c)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* --- Grupo 2: Cabeçalho --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Cabeçalho
          </h3>
          <div className="space-y-2">
            <Label htmlFor="reportTitle">Título</Label>
            <Input
              id="reportTitle"
              value={config.reportTitle}
              onChange={(e) =>
                updateConfig("reportTitle", e.target.value.slice(0, 35))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customScope">Subtítulo</Label>
            <Input
              id="customScope"
              value={config.customScope}
              onChange={(e) =>
                updateConfig("customScope", e.target.value.slice(0, 35))
              }
            />
          </div>
        </div>

        <Separator />

        {/* --- Grupo 3: Organização --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4" /> Organização & Filtros
          </h3>

          {/* 1. Agrupar por CATEGORIA */}
          <div
            className={`space-y-3 p-3 border border-dashed rounded-md relative ${config.groupByCategory ? "border-primary/50 bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="groupByCategory"
                    className="cursor-pointer font-semibold"
                  >
                    Agrupar por Categoria
                  </Label>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-transparent rounded-sm"
                        title="Filtrar Categorias"
                        disabled={!config.groupByCategory}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-colors ${config.groupByCategory ? "text-slate-600" : "text-slate-300"}`}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="p-3 flex items-center gap-1 border-b ">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-sm cursor-default">
                          Filtrar Categorias
                        </span>
                      </div>
                      <div className="p-2 border-b">
                        <div
                          className="flex items-center gap-2 px-2 py-1.5 hover:text-blue-600 rounded cursor-pointer"
                          onClick={() =>
                            handleFilterChange(
                              "category",
                              "ALL",
                              !isAllSelected("category"),
                            )
                          }
                        >
                          <Checkbox checked={isAllSelected("category")} />
                          <span className="text-sm font-medium">
                            (Selecionar Tudo)
                          </span>
                        </div>
                      </div>
                      <ScrollArea className="h-64">
                        <div className="p-2 space-y-1">
                          {availableCategories.map((cat) => (
                            <div
                              key={cat}
                              className="flex items-center gap-2 px-2 py-1.5 hover:text-blue-600 rounded cursor-pointer"
                              onClick={() =>
                                handleFilterChange(
                                  "category",
                                  cat,
                                  !config.selectedCategories?.includes(cat),
                                )
                              }
                            >
                              <Checkbox
                                checked={config.selectedCategories?.includes(
                                  cat,
                                )}
                              />
                              <span className="text-sm truncate">{cat}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Cria seções separadas para cada categoria.
                </span>
              </div>
              <Switch
                id="groupByCategory"
                checked={config.groupByCategory}
                onCheckedChange={(c) => handleGroupToggle("category", c)}
              />
            </div>

            {/* Opção 1.1: Totais na Linha */}
            <div className="flex items-center justify-between gap-2 pl-4 border-l-2 border-gray-200">
              <Label
                htmlFor="showCategoryTotals"
                className={`cursor-pointer text-xs ${!config.groupByCategory ? "text-gray-400" : ""}`}
              >
                Exibir Totais na Linha
              </Label>
              <Switch
                id="showCategoryTotals"
                checked={config.showCategoryTotals}
                onCheckedChange={(c) => updateConfig("showCategoryTotals", c)}
                disabled={
                  !config.groupByCategory || config.showOnlyCategorySummary
                } // Desativa se o "Somente" estiver ligado
              />
            </div>

            {/* Opção 1.2: Somente Categoria (NOVO) */}
            <div className="flex items-center justify-between gap-2 pl-4 border-l-2 border-gray-200">
              <div className="flex flex-col">
                <Label
                  htmlFor="showOnlyCategorySummary"
                  className={`cursor-pointer text-xs font-semibold ${!config.groupByCategory ? "text-gray-400" : "text-blue-700"}`}
                >
                  Exibir Somente a Categoria
                </Label>
                <span className="text-[9px] text-muted-foreground leading-tight">
                  Oculta itens, mostra resumo.
                </span>
              </div>
              <Switch
                id="showOnlyCategorySummary"
                checked={config.showOnlyCategorySummary}
                onCheckedChange={(c) =>
                  updateConfig("showOnlyCategorySummary", c)
                }
                disabled={!config.groupByCategory}
              />
            </div>
          </div>

          {/* 2. Agrupar por SUBCATEGORIA */}
          <div
            className={`space-y-3 p-3 border border-dashed rounded-md relative ${config.groupBySubcategory ? "border-primary/50 bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="groupBySubcategory"
                    className="cursor-pointer font-semibold"
                  >
                    Agrupar por Subcategoria
                  </Label>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-transparent rounded-sm"
                        title="Filtrar Subcategorias"
                        disabled={!config.groupBySubcategory}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-colors ${config.groupBySubcategory ? "text-slate-600" : "text-slate-300"}`}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="p-3 flex items-center gap-1 border-b">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-sm cursor-default">
                          Filtrar Subcategorias
                        </span>
                      </div>
                      <div className="p-2 border-b">
                        <div
                          className="flex items-center gap-2 px-2 py-1.5 hover:text-blue-600 rounded cursor-pointer"
                          onClick={() =>
                            handleFilterChange(
                              "subcategory",
                              "ALL",
                              !isAllSelected("subcategory"),
                            )
                          }
                        >
                          <Checkbox checked={isAllSelected("subcategory")} />
                          <span className="text-sm font-medium">
                            (Selecionar Tudo)
                          </span>
                        </div>
                      </div>
                      <ScrollArea className="h-64">
                        <div className="p-2 space-y-1">
                          {availableSubcategories.map((sub) => (
                            <div
                              key={sub}
                              className="flex items-center gap-2 px-2 py-1.5 hover:text-blue-600 rounded cursor-pointer"
                              onClick={() =>
                                handleFilterChange(
                                  "subcategory",
                                  sub,
                                  !config.selectedSubcategories?.includes(sub),
                                )
                              }
                            >
                              <Checkbox
                                checked={config.selectedSubcategories?.includes(
                                  sub,
                                )}
                              />
                              <span className="text-sm truncate">{sub}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Cria seções para cada subcategoria.
                </span>
              </div>
              <Switch
                id="groupBySubcategory"
                checked={config.groupBySubcategory}
                onCheckedChange={(c) => handleGroupToggle("subcategory", c)}
              />
            </div>

            {/* Opção 2.1: Totais na Linha */}
            <div className="flex items-center justify-between gap-2 pl-4 border-l-2 border-gray-200">
              <Label
                htmlFor="showSubCategoryTotals"
                className={`cursor-pointer text-xs ${!config.groupBySubcategory ? "text-gray-400" : ""}`}
              >
                Exibir Totais na Linha
              </Label>
              <Switch
                id="showSubCategoryTotals"
                checked={config.showSubCategoryTotals}
                onCheckedChange={(c) =>
                  updateConfig("showSubCategoryTotals", c)
                }
                disabled={
                  !config.groupBySubcategory ||
                  config.showOnlySubcategorySummary
                }
              />
            </div>

            {/* Opção 2.2: Somente Subcategoria (NOVO) */}
            <div className="flex items-center justify-between gap-2 pl-4 border-l-2 border-gray-200">
              <div className="flex flex-col">
                <Label
                  htmlFor="showOnlySubcategorySummary"
                  className={`cursor-pointer text-xs font-semibold ${!config.groupBySubcategory ? "text-gray-400" : "text-blue-700"}`}
                >
                  Exibir Somente a Subcategoria
                </Label>
                <span className="text-[9px] text-muted-foreground leading-tight">
                  Oculta itens, mostra resumo.
                </span>
              </div>
              <Switch
                id="showOnlySubcategorySummary"
                checked={config.showOnlySubcategorySummary}
                onCheckedChange={(c) =>
                  updateConfig("showOnlySubcategorySummary", c)
                }
                disabled={!config.groupBySubcategory}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex flex-col">
              <Label htmlFor="showCategoryInItem" className="cursor-pointer">
                Mostrar Categoria no Item
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Exibe o nome da categoria abaixo da descrição do produto.
              </span>
            </div>
            <Switch
              id="showCategoryInItem"
              checked={config.showCategoryInItem}
              onCheckedChange={(c) => updateConfig("showCategoryInItem", c)}
            />
          </div>
        </div>

        <Separator />

        {/* --- Grupo 4: Logo --- */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            Logo no Relatório
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wider">
                Exibir logo
              </span>
              <span className="text-[11px] text-muted-foreground">
                Mostra uma logo fixa no cabeçalho.
              </span>
            </div>
            <Switch
              id="show-logo"
              checked={config.showLogo}
              onCheckedChange={(c) => updateConfig("showLogo", c)}
            />
          </div>
          {config.showLogo && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-card/60 p-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-32 border border-dashed border-border/60 rounded-md bg-background flex items-center justify-center overflow-hidden">
                  {config.useDefaultLogo && !config.logoDataUrl && (
                    <img
                      src="/report-data-logo.png"
                      alt="Logo padrão"
                      className="max-h-14 max-w-[7rem] object-contain"
                    />
                  )}
                  {!config.useDefaultLogo && config.logoDataUrl && (
                    <img
                      src={config.logoDataUrl}
                      alt="Logo personalizada"
                      className="max-h-14 max-w-[7rem] object-contain"
                    />
                  )}
                  {!config.useDefaultLogo && !config.logoDataUrl && (
                    <span className="text-[11px] text-muted-foreground px-2 text-center">
                      Nenhuma logo selecionada
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <strong>Dimensão sugerida:</strong>
                  <span> 512×512 px ou 600×600 px.</span>
                  <strong>Formato aceito:</strong>
                  <span>PNG com fundo transparente.</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showLogo: true,
                      useDefaultLogo: true,
                      logoDataUrl: null,
                    })
                  }
                >
                  Usar logo padrão
                </Button>
                <label className="inline-flex items-center">
                  <span className="sr-only">Enviar logo</span>
                  <input
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || file.type !== "image/png") return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result as string;
                        setConfig({
                          ...config,
                          showLogo: true,
                          useDefaultLogo: false,
                          logoDataUrl: result,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(ev) => {
                      const input =
                        (ev.currentTarget
                          .previousSibling as HTMLInputElement) ?? null;
                      if (input) input.click();
                    }}
                  >
                    Enviar logo
                  </Button>
                </label>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* --- Grupo 5: Impressão --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Impressão
          </h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="showSignature">Área de Assinaturas</Label>
            <Switch
              id="showSignature"
              checked={config.showSignatureBlock}
              onCheckedChange={(c) => updateConfig("showSignatureBlock", c)}
            />
          </div>
          {config.showSignatureBlock && (
            <div className="flex items-center justify-between pl-4 border-l-2">
              <Label htmlFor="showCpf">Linha para CPF</Label>
              <Switch
                id="showCpf"
                checked={config.showCpfLine}
                onCheckedChange={(c) => updateConfig("showCpfLine", c)}
              />
            </div>
          )}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">
                Limite de Caracteres (Nomes)
              </Label>
              <span className="text-xs font-mono bg-muted px-1.5 rounded">
                {config.truncateLimit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleTruncateChange(config.truncateLimit - 5)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/50 transition-all"
                  style={{
                    width: `${((config.truncateLimit - 10) / 90) * 100}%`,
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleTruncateChange(config.truncateLimit + 5)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
