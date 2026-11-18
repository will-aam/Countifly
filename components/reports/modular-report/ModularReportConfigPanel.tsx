// components/reports/modular-report/ModularReportConfigPanel.tsx
"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Columns,
  ClipboardList,
  AlertOctagon,
  Settings2,
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import type { ModularReportConfig, AuditBlockPosition } from "./types";

interface ModularReportConfigPanelProps {
  config: ModularReportConfig;
  setConfig: React.Dispatch<React.SetStateAction<ModularReportConfig>>;
  hasRecountLogs: boolean;
  hasLosses: boolean;
}

export function ModularReportConfigPanel({
  config,
  setConfig,
  hasRecountLogs,
  hasLosses,
}: ModularReportConfigPanelProps) {
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
        location: enabled,
        validade: enabled,
        lote: enabled,
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

  return (
    <div className="bg-card border-r border-border h-full flex flex-col text-xs sm:text-sm">
      <div className="p-4 border-b border-border/80 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Configurar Relatório
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Personalize a visualização executiva e impressão do Modular.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid grid-cols-4 h-9 p-0.5 bg-muted/60 rounded-lg">
            <TabsTrigger value="columns" className="text-xs flex items-center gap-1">
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Colunas</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Auditoria</span>
            </TabsTrigger>
            <TabsTrigger value="kpis" className="text-xs flex items-center gap-1">
              <AlertOctagon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resumo</span>
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Layout</span>
            </TabsTrigger>
          </TabsList>

          {/* 1. ABA COLUNAS */}
          <TabsContent value="columns" className="space-y-4 pt-4">
            <div className="flex items-center justify-between pb-1">
              <p className="font-semibold text-xs text-foreground">Colunas da Tabela</p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => setAllColumns(true)}
                >
                  Todas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2 text-muted-foreground"
                  onClick={() => setAllColumns(false)}
                >
                  Mínimas
                </Button>
              </div>
            </div>

            <div className="space-y-2.5 divide-y divide-border/40">
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="col-barcode" className="text-xs cursor-pointer">Cód. de Barras (EAN)</Label>
                <Switch
                  id="col-barcode"
                  checked={config.columns.barcode}
                  onCheckedChange={(v) => updateColumn("barcode", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-sku" className="text-xs cursor-pointer">Código do Produto (SKU)</Label>
                <Switch
                  id="col-sku"
                  checked={config.columns.sku}
                  onCheckedChange={(v) => updateColumn("sku", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-desc" className="text-xs cursor-pointer">Descrição do Produto</Label>
                <Switch
                  id="col-desc"
                  checked={config.columns.description}
                  onCheckedChange={(v) => updateColumn("description", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-loc" className="text-xs cursor-pointer">Localização Física</Label>
                <Switch
                  id="col-loc"
                  checked={config.columns.location}
                  onCheckedChange={(v) => updateColumn("location", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-validade" className="text-xs cursor-pointer">Data de Validade</Label>
                <Switch
                  id="col-validade"
                  checked={config.columns.validade}
                  onCheckedChange={(v) => updateColumn("validade", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-lote" className="text-xs cursor-pointer">Lote de Fabricação</Label>
                <Switch
                  id="col-lote"
                  checked={config.columns.lote}
                  onCheckedChange={(v) => updateColumn("lote", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-status" className="text-xs cursor-pointer">Condição / Status (Avaria/Vencido)</Label>
                <Switch
                  id="col-status"
                  checked={config.columns.status}
                  onCheckedChange={(v) => updateColumn("status", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-loja" className="text-xs cursor-pointer">Qtd Loja / Salão</Label>
                <Switch
                  id="col-loja"
                  checked={config.columns.loja}
                  onCheckedChange={(v) => updateColumn("loja", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-estoque" className="text-xs cursor-pointer">Qtd Depósito / Estoque</Label>
                <Switch
                  id="col-estoque"
                  checked={config.columns.estoque}
                  onCheckedChange={(v) => updateColumn("estoque", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-total" className="text-xs cursor-pointer font-semibold">Quantidade Total Contada</Label>
                <Switch
                  id="col-total"
                  checked={config.columns.totalQty}
                  onCheckedChange={(v) => updateColumn("totalQty", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-custo" className="text-xs cursor-pointer">Custo Unitário (R$)</Label>
                <Switch
                  id="col-custo"
                  checked={config.columns.unitCost}
                  onCheckedChange={(v) => updateColumn("unitCost", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-valortotal" className="text-xs cursor-pointer">Valor Total (R$)</Label>
                <Switch
                  id="col-valortotal"
                  checked={config.columns.totalValue}
                  onCheckedChange={(v) => updateColumn("totalValue", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-abc" className="text-xs cursor-pointer">Curva ABC</Label>
                <Switch
                  id="col-abc"
                  checked={config.columns.curvaAbc}
                  onCheckedChange={(v) => updateColumn("curvaAbc", v)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="col-datetime" className="text-xs cursor-pointer">Data e Hora da Leitura</Label>
                <Switch
                  id="col-datetime"
                  checked={config.columns.dateTime}
                  onCheckedChange={(v) => updateColumn("dateTime", v)}
                />
              </div>
            </div>
          </TabsContent>

          {/* 2. ABA AUDITORIA & CORTES */}
          <TabsContent value="audit" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Posição do Bloco de Auditoria & Cortes</Label>
              <p className="text-[11px] text-muted-foreground">
                Exibe o congelamento de fotografia, cortes de NF de entrada e saída.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(
                  [
                    { id: "top", label: "No Topo (Cabeçalho)" },
                    { id: "bottom", label: "No Rodapé (Final)" },
                    { id: "both", label: "Em Ambos" },
                    { id: "none", label: "Ocultar Bloco" },
                  ] as { id: AuditBlockPosition; label: string }[]
                ).map((pos) => (
                  <Button
                    key={pos.id}
                    type="button"
                    variant={config.auditBlockPosition === pos.id ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs justify-start"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, auditBlockPosition: pos.id }))
                    }
                  >
                    {pos.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-recount-table" className="text-xs font-semibold cursor-pointer">
                    Tabela de Auditoria de Corte (2ª Leitura)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Exibe a lista formal de SKUs divergentes recontados e validados por 2º auditor.
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
                <span className="text-[10px] text-amber-600 block">
                  Nenhuma recontagem registrada neste inventário.
                </span>
              )}
            </div>
          </TabsContent>

          {/* 3. ABA RESUMO & PERDAS */}
          <TabsContent value="kpis" className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="font-semibold text-xs text-foreground">Cards de Resumo no Topo</p>
              <div className="space-y-2 divide-y divide-border/40">
                <div className="flex items-center justify-between pt-1">
                  <Label htmlFor="kpi-qty" className="text-xs cursor-pointer">Total de Peças Contadas</Label>
                  <Switch
                    id="kpi-qty"
                    checked={config.kpis.totalQty}
                    onCheckedChange={(v) => updateKpi("totalQty", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="kpi-skus" className="text-xs cursor-pointer">Total de SKUs Únicos</Label>
                  <Switch
                    id="kpi-skus"
                    checked={config.kpis.totalSkus}
                    onCheckedChange={(v) => updateKpi("totalSkus", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="kpi-value" className="text-xs cursor-pointer">Valor Físico Total (R$)</Label>
                  <Switch
                    id="kpi-value"
                    checked={config.kpis.totalValue}
                    onCheckedChange={(v) => updateKpi("totalValue", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="kpi-damaged" className="text-xs cursor-pointer">Itens Avariados (Perdas)</Label>
                  <Switch
                    id="kpi-damaged"
                    checked={config.kpis.damagedCount}
                    onCheckedChange={(v) => updateKpi("damagedCount", v)}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="kpi-expired" className="text-xs cursor-pointer">Itens Vencidos (Perdas)</Label>
                  <Switch
                    id="kpi-expired"
                    checked={config.kpis.expiredCount}
                    onCheckedChange={(v) => updateKpi("expiredCount", v)}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="highlight-losses" className="text-xs font-semibold cursor-pointer">
                    Destaque de Prevenção de Perdas
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Destaca em vermelho os itens avariados ou com data de validade vencida na listagem.
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
          </TabsContent>

          {/* 4. ABA LAYOUT & ASSINATURAS */}
          <TabsContent value="layout" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="rep-title" className="text-xs font-semibold">Título do Relatório</Label>
              <Input
                id="rep-title"
                value={config.reportTitle}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, reportTitle: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rep-company" className="text-xs font-semibold">Empresa / Loja</Label>
                <Input
                  id="rep-company"
                  value={config.companyName}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, companyName: e.target.value }))
                  }
                  placeholder="Ex: Matriz Centro"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rep-cnpj" className="text-xs font-semibold">CNPJ / Inscrição</Label>
                <Input
                  id="rep-cnpj"
                  value={config.companyCnpj}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, companyCnpj: e.target.value }))
                  }
                  placeholder="00.000.000/0001-00"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Orientação da Impressão</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={config.orientation === "landscape" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setConfig((prev) => ({ ...prev, orientation: "landscape" }))}
                >
                  Paisagem (Recomendado)
                </Button>
                <Button
                  type="button"
                  variant={config.orientation === "portrait" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setConfig((prev) => ({ ...prev, orientation: "portrait" }))}
                >
                  Retrato
                </Button>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-sig" className="text-xs font-semibold cursor-pointer">
                  Bloco de Assinaturas Formais
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
                    <Label htmlFor="show-cpf" className="text-xs text-muted-foreground cursor-pointer">
                      Linha de CPF dos signatários
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
