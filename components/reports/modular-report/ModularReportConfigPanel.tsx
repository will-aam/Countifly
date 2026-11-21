// components/reports/modular-report/ModularReportConfigPanel.tsx
"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Columns,
  ClipboardList,
  AlertOctagon,
  Settings2,
  FileCheck2,
  ChevronDown,
  Loader2,
  Building2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ModularReportConfig, AuditBlockPosition } from "./types";

// Máscara oficial brasileira para CNPJ (00.000.000/0000-00)
const formatCnpj = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
};

interface ModularReportConfigPanelProps {
  config: ModularReportConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModularReportConfig>>;
  hasRecountLogs: boolean;
  hasLosses: boolean;
  hasValidadeData?: boolean;
  hasLoteData?: boolean;
  hasNcmData?: boolean;
}

export function ModularReportConfigPanel({
  config,
  setConfig,
  hasRecountLogs,
  hasLosses,
  hasValidadeData = true,
  hasLoteData = true,
  hasNcmData = true,
}: ModularReportConfigPanelProps) {
  // Seção aberta no estilo acordeão (Resumo & KPIs aberto por padrão)
  const [openSection, setOpenSection] = useState<string>("kpis");
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  // Busca automática na BrasilAPI ao completar 14 dígitos do CNPJ
  const handleCnpjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setConfig((prev) => ({ ...prev, companyCnpj: formatted }));

    const rawCnpj = formatted.replace(/\D/g, "");
    if (rawCnpj.length === 14) {
      setSearchingCnpj(true);
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`);
        if (!response.ok) throw new Error("CNPJ não encontrado");

        const data = await response.json();
        const companyName = data.nome_fantasia || data.razao_social || "";
        if (companyName) {
          setConfig((prev) => ({
            ...prev,
            companyName: companyName,
          }));
          toast({
            title: "Empresa identificada!",
            description: companyName,
          });
        }
      } catch {
        toast({
          title: "Atenção",
          description: "Não foi possível puxar os dados deste CNPJ na BrasilAPI.",
          variant: "destructive",
        });
      } finally {
        setSearchingCnpj(false);
      }
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSection((prev) => (prev === sectionId ? "" : sectionId));
  };

  const updateColumn = (key: keyof ModularReportConfig["columns"], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [key]: value,
      },
    }));
  };

  const updateKpi = (key: keyof ModularReportConfig["kpis"], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      kpis: {
        ...prev.kpis,
        [key]: value,
      },
    }));
  };

  const setAllColumns = (enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      columns: {
        barcode: enabled,
        sku: enabled,
        description: true, // descrição é sempre relevante
        ncm: enabled && Boolean(hasNcmData),
        location: enabled,
        validade: enabled && Boolean(hasValidadeData),
        lote: enabled && Boolean(hasLoteData),
        status: enabled,
        loja: enabled,
        estoque: enabled,
        totalQty: true,
        unitCost: enabled,
        totalValue: enabled,
        curvaAbc: enabled,
        dateTime: enabled,
      },
    }));
  };

  const activeColumnsCount = Object.values(config.columns).filter(Boolean).length;

  return (
    <div className="bg-card border-r border-border h-full flex flex-col text-xs sm:text-sm">
      {/* Topo do Sidebar */}
      <div className="p-4 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
        <div>
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary shrink-0" />
            Configuração do Relatório
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Personalize seções, colunas e cabeçalho executivo.
          </p>
        </div>
      </div>

      {/* Lista de Seções Expansíveis com Rolagem Única */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* 1. SEÇÃO: RESUMO EXECUTIVO & PREVENÇÃO */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card transition-colors">
          <button
            type="button"
            onClick={() => toggleSection("kpis")}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <AlertOctagon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">
                  Resumo & Prevenção
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Cards de KPIs e perdas
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                openSection === "kpis" && "rotate-180 text-foreground"
              )}
            />
          </button>

          {openSection === "kpis" && (
            <div className="p-3.5 pt-0 border-t border-border/50 space-y-3.5 bg-muted/10">
              <div className="space-y-2 pt-2.5">
                <p className="font-semibold text-xs text-foreground">Cards de Resumo</p>
                <div className="space-y-2 divide-y divide-border/40 text-xs">
                  <div className="flex items-center justify-between pt-1">
                    <Label htmlFor="kpi-qty" className="cursor-pointer text-[11px]">
                      Total de Peças Contadas
                    </Label>
                    <Switch
                      id="kpi-qty"
                      checked={config.kpis.totalQty}
                      onCheckedChange={(v) => updateKpi("totalQty", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="kpi-skus" className="cursor-pointer text-[11px]">
                      Total de SKUs Únicos
                    </Label>
                    <Switch
                      id="kpi-skus"
                      checked={config.kpis.totalSkus}
                      onCheckedChange={(v) => updateKpi("totalSkus", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="kpi-value" className="cursor-pointer text-[11px]">
                      Valor Físico Total (R$)
                    </Label>
                    <Switch
                      id="kpi-value"
                      checked={config.kpis.totalValue}
                      onCheckedChange={(v) => updateKpi("totalValue", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="kpi-damaged" className="cursor-pointer text-[11px]">
                      Itens Avariados (Perdas)
                    </Label>
                    <Switch
                      id="kpi-damaged"
                      checked={config.kpis.damagedCount}
                      onCheckedChange={(v) => updateKpi("damagedCount", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="kpi-expired" className="cursor-pointer text-[11px]">
                      Itens Vencidos (Perdas)
                    </Label>
                    <Switch
                      id="kpi-expired"
                      checked={config.kpis.expiredCount}
                      onCheckedChange={(v) => updateKpi("expiredCount", v)}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="pr-2">
                    <Label
                      htmlFor="highlight-losses"
                      className="text-xs font-semibold cursor-pointer block"
                    >
                      Destaque de Prevenção de Perdas
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Realça com alerta vermelho os produtos avariados ou vencidos na lista.
                    </p>
                  </div>
                  <Switch
                    id="highlight-losses"
                    checked={config.highlightLosses}
                    onCheckedChange={(v) =>
                      setConfig((prev) => ({ ...prev, highlightLosses: v }))
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. SEÇÃO: AUDITORIA & CORTES CONTÁBEIS */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card transition-colors">
          <button
            type="button"
            onClick={() => toggleSection("audit")}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">
                  Auditoria & Cortes
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {config.auditBlockPosition !== "none" ? "Bloco visível" : "Bloco oculto"}
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                openSection === "audit" && "rotate-180 text-foreground"
              )}
            />
          </button>

          {openSection === "audit" && (
            <div className="p-3.5 pt-0 border-t border-border/50 space-y-3.5 bg-muted/10">
              <div className="space-y-2 pt-2.5">
                <Label className="text-[11px] font-semibold text-foreground">
                  Posição do Bloco de Cortes Contábeis
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Congelamento, NF entrada, cupom saída e recontagens validadas.
                </p>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(
                    [
                      { id: "top", label: "No Topo" },
                      { id: "bottom", label: "No Rodapé" },
                      { id: "none", label: "Ocultar" },
                    ] as { id: AuditBlockPosition; label: string }[]
                  ).map((pos) => (
                    <Button
                      key={pos.id}
                      type="button"
                      variant={config.auditBlockPosition === pos.id ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs px-1"
                      onClick={() =>
                        setConfig((prev) => ({ ...prev, auditBlockPosition: pos.id }))
                      }
                    >
                      {pos.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator className="my-2" />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="pr-2">
                    <Label
                      htmlFor="show-recount-table"
                      className="text-xs font-semibold cursor-pointer block text-foreground"
                    >
                      Registro Oficial de Recontagem & Auditoria de Corte
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Exibe ou oculta a tabela com o histórico da 2ª leitura dos auditores.
                    </p>
                  </div>
                  <Switch
                    id="show-recount-table"
                    checked={config.showRecountTable}
                    onCheckedChange={(v) =>
                      setConfig((prev) => ({ ...prev, showRecountTable: v }))
                    }
                    disabled={!hasRecountLogs}
                  />
                </div>
                {!hasRecountLogs && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block pt-1">
                    Nenhuma recontagem registrada neste inventário.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. SEÇÃO: COLUNAS DA TABELA */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card transition-colors">
          <button
            type="button"
            onClick={() => toggleSection("columns")}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Columns className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">
                  Colunas da Tabela
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {activeColumnsCount} colunas ativas
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                openSection === "columns" && "rotate-180 text-foreground"
              )}
            />
          </button>

          {openSection === "columns" && (
            <div className="p-3.5 pt-0 border-t border-border/50 space-y-3 bg-muted/10">
              <div className="flex items-center justify-between pt-2.5 pb-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Campos visíveis na listagem:
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setAllColumns(true)}
                  >
                    Todas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-muted-foreground"
                    onClick={() => setAllColumns(false)}
                  >
                    Mínimas
                  </Button>
                </div>
              </div>

              <div className="space-y-2 divide-y divide-border/40 text-xs">
                <div className="flex items-center justify-between pt-1">
                  <Label htmlFor="col-barcode" className="cursor-pointer text-[11px]">
                    Cód. de Barras (EAN)
                  </Label>
                  <Switch
                    id="col-barcode"
                    checked={config.columns.barcode}
                    onCheckedChange={(v) => updateColumn("barcode", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-sku" className="cursor-pointer text-[11px]">
                    Código do Produto (SKU)
                  </Label>
                  <Switch
                    id="col-sku"
                    checked={config.columns.sku}
                    onCheckedChange={(v) => updateColumn("sku", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-desc" className="cursor-pointer text-[11px]">
                    Descrição do Produto
                  </Label>
                  <Switch
                    id="col-desc"
                    checked={config.columns.description}
                    onCheckedChange={(v) => updateColumn("description", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col pr-2">
                    <Label
                      htmlFor="col-ncm"
                      className={cn(
                        "text-[11px]",
                        hasNcmData ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground opacity-60"
                      )}
                    >
                      NCM (Fiscal)
                    </Label>
                    {!hasNcmData && (
                      <span className="text-[9px] text-muted-foreground/80 italic">
                        Sem dados nesta contagem
                      </span>
                    )}
                  </div>
                  <Switch
                    id="col-ncm"
                    disabled={!hasNcmData}
                    checked={Boolean(hasNcmData && config.columns.ncm)}
                    onCheckedChange={(v) => updateColumn("ncm", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-loc" className="cursor-pointer text-[11px]">
                    Localização Física
                  </Label>
                  <Switch
                    id="col-loc"
                    checked={config.columns.location}
                    onCheckedChange={(v) => updateColumn("location", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col pr-2">
                    <Label
                      htmlFor="col-validade"
                      className={cn(
                        "text-[11px]",
                        hasValidadeData ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground opacity-60"
                      )}
                    >
                      Data de Validade
                    </Label>
                    {!hasValidadeData && (
                      <span className="text-[9px] text-muted-foreground/80 italic">
                        Sem dados nesta contagem
                      </span>
                    )}
                  </div>
                  <Switch
                    id="col-validade"
                    disabled={!hasValidadeData}
                    checked={Boolean(hasValidadeData && config.columns.validade)}
                    onCheckedChange={(v) => updateColumn("validade", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col pr-2">
                    <Label
                      htmlFor="col-lote"
                      className={cn(
                        "text-[11px]",
                        hasLoteData ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground opacity-60"
                      )}
                    >
                      Lote de Fabricação
                    </Label>
                    {!hasLoteData && (
                      <span className="text-[9px] text-muted-foreground/80 italic">
                        Sem dados nesta contagem
                      </span>
                    )}
                  </div>
                  <Switch
                    id="col-lote"
                    disabled={!hasLoteData}
                    checked={Boolean(hasLoteData && config.columns.lote)}
                    onCheckedChange={(v) => updateColumn("lote", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-status" className="cursor-pointer text-[11px]">
                    Condição / Status (Avaria/Vencido)
                  </Label>
                  <Switch
                    id="col-status"
                    checked={config.columns.status}
                    onCheckedChange={(v) => updateColumn("status", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-loja" className="cursor-pointer text-[11px]">
                    Qtd Loja / Salão
                  </Label>
                  <Switch
                    id="col-loja"
                    checked={config.columns.loja}
                    onCheckedChange={(v) => updateColumn("loja", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-estoque" className="cursor-pointer text-[11px]">
                    Qtd Depósito / Estoque
                  </Label>
                  <Switch
                    id="col-estoque"
                    checked={config.columns.estoque}
                    onCheckedChange={(v) => updateColumn("estoque", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-total" className="cursor-pointer text-[11px] font-semibold">
                    Quantidade Total Contada
                  </Label>
                  <Switch
                    id="col-total"
                    checked={config.columns.totalQty}
                    onCheckedChange={(v) => updateColumn("totalQty", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-custo" className="cursor-pointer text-[11px]">
                    Custo Unitário (R$)
                  </Label>
                  <Switch
                    id="col-custo"
                    checked={config.columns.unitCost}
                    onCheckedChange={(v) => updateColumn("unitCost", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-valortotal" className="cursor-pointer text-[11px]">
                    Valor Total (R$)
                  </Label>
                  <Switch
                    id="col-valortotal"
                    checked={config.columns.totalValue}
                    onCheckedChange={(v) => updateColumn("totalValue", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-abc" className="cursor-pointer text-[11px]">
                    Curva ABC
                  </Label>
                  <Switch
                    id="col-abc"
                    checked={config.columns.curvaAbc}
                    onCheckedChange={(v) => updateColumn("curvaAbc", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="col-datetime" className="cursor-pointer text-[11px]">
                    Data e Hora da Bipagem
                  </Label>
                  <Switch
                    id="col-datetime"
                    checked={config.columns.dateTime}
                    onCheckedChange={(v) => updateColumn("dateTime", v)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. SEÇÃO: LAYOUT, DADOS DA EMPRESA & ASSINATURAS */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card transition-colors">
          <button
            type="button"
            onClick={() => toggleSection("layout")}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">
                  Layout & Assinaturas
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {config.orientation === "landscape" ? "Paisagem" : "Retrato"}
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                openSection === "layout" && "rotate-180 text-foreground"
              )}
            />
          </button>

          {openSection === "layout" && (
            <div className="p-3.5 pt-0 border-t border-border/50 space-y-3 bg-muted/10">
              <div className="space-y-1 pt-2.5">
                <Label htmlFor="rep-title" className="text-xs font-semibold">
                  Título do Relatório
                </Label>
                <Input
                  id="rep-title"
                  value={config.reportTitle}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, reportTitle: e.target.value }))
                  }
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rep-cnpj" className="text-[11px] font-semibold">
                      CNPJ
                    </Label>
                    {searchingCnpj && (
                      <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                      </span>
                    )}
                  </div>
                  <Input
                    id="rep-cnpj"
                    value={config.companyCnpj}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rep-company" className="text-[11px] font-semibold">
                    Empresa / Razão Social
                  </Label>
                  <Input
                    id="rep-company"
                    value={config.companyName}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                    placeholder="Nome preenchido automaticamente"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold">Orientação da Página</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant={config.orientation === "landscape" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, orientation: "landscape" }))
                    }
                  >
                    Paisagem
                  </Button>
                  <Button
                    type="button"
                    variant={config.orientation === "portrait" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, orientation: "portrait" }))
                    }
                  >
                    Retrato
                  </Button>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-sig" className="text-xs font-semibold cursor-pointer">
                    Assinaturas Formais
                  </Label>
                  <Switch
                    id="show-sig"
                    checked={config.showSignatures}
                    onCheckedChange={(v) =>
                      setConfig((prev) => ({ ...prev, showSignatures: v }))
                    }
                  />
                </div>

                {config.showSignatures && (
                  <div className="space-y-2 pl-2 border-l-2 border-border/60">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="show-cpf"
                        className="text-[11px] text-muted-foreground cursor-pointer"
                      >
                        Linha para CPF
                      </Label>
                      <Switch
                        id="show-cpf"
                        checked={config.showCpfLine}
                        onCheckedChange={(v) =>
                          setConfig((prev) => ({ ...prev, showCpfLine: v }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
