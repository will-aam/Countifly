import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReportConfig } from "./types";

interface ReportConfigPanelProps {
  config: ReportConfig;
  setConfig: (config: ReportConfig) => void;
  // Removi o onPrint daqui, pois o botão agora fica no pai (page.tsx)
}

export const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  config,
  setConfig,
}) => {
  const updateConfig = (key: keyof ReportConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  // Função segura para alterar o limite com os botões
  const handleTruncateChange = (newValue: number) => {
    // Mantém entre 10 e 100 caracteres
    if (newValue >= 10 && newValue <= 100) {
      updateConfig("truncateLimit", newValue);
    }
  };

  return (
    <TooltipProvider>
      <div className="bg-background p-4 space-y-6">
        {/* --- Seção 1: Resumo Executivo (KPIs) --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Resumo (Cards)
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="cardSku" className="cursor-pointer">
                  Total de SKUs
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 text-[9px] leading-none"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Quantidade de produtos distintos (códigos) exibidos no
                      relatório, após aplicar os filtros.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardSku"
                checked={config.showCardSku}
                onCheckedChange={(c) => updateConfig("showCardSku", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="cardSystem" className="cursor-pointer">
                  Estoque Sistema
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 text-[9px] leading-none"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Soma das quantidades que o sistema esperava (saldo
                      teórico) para todos os SKUs do relatório.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardSystem"
                checked={config.showCardSystem}
                onCheckedChange={(c) => updateConfig("showCardSystem", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="cardCounted" className="cursor-pointer">
                  Contagem Física
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 text-[9px] leading-none"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Soma das quantidades físicas contadas (Loja + Estoque)
                      para todos os SKUs do relatório.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardCounted"
                checked={config.showCardCounted}
                onCheckedChange={(c) => updateConfig("showCardCounted", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="cardDivergence" className="cursor-pointer">
                  Divergência
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 text-[9px] leading-none"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Diferença total entre o estoque previsto e o contado (soma
                      das diferenças de cada SKU). Positivo indica sobra;
                      negativo indica falta.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardDivergence"
                checked={config.showCardDivergence}
                onCheckedChange={(c) => updateConfig("showCardDivergence", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Label
                  htmlFor="cardAccuracy"
                  className="cursor-pointer font-semibold text-blue-600"
                >
                  Acuracidade (%)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-500 text-[9px] leading-none"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Percentual de SKUs sem divergência (diferença zero) em
                      relação ao total de SKUs exibidos no relatório.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardAccuracy"
                checked={config.showCardAccuracy}
                onCheckedChange={(c) => updateConfig("showCardAccuracy", c)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* --- Seção 2: Tabela de Itens --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Tabela & Filtros
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="showCorrect">Itens Corretos</Label>
              <Switch
                id="showCorrect"
                checked={config.showCorrect}
                onCheckedChange={(c) => updateConfig("showCorrect", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="showSurplus">Sobras (+)</Label>
              <Switch
                id="showSurplus"
                checked={config.showSurplus}
                onCheckedChange={(c) => updateConfig("showSurplus", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="showMissing">Faltas (-)</Label>
              <Switch
                id="showMissing"
                checked={config.showMissing}
                onCheckedChange={(c) => updateConfig("showMissing", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="hideDecimals">Remover casas decimais</Label>
              <Switch
                id="hideDecimals"
                checked={config.hideDecimals}
                onCheckedChange={(c) => updateConfig("hideDecimals", c)}
              />
            </div>

            <div className="pt-2 border-t border-dashed">
              <div className="flex items-center justify-between">
                <Label htmlFor="auditColumn" className="font-semibold">
                  Coluna "Visto" [ ]
                </Label>
                <Switch
                  id="auditColumn"
                  checked={config.showAuditColumn}
                  onCheckedChange={(c) => updateConfig("showAuditColumn", c)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Adiciona um espaço em branco na tabela para checagem manual no
                papel (marcar itens revisados).
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* --- Seção 3: Personalização --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Cabeçalho
          </h3>

          <div className="space-y-2">
            <Label htmlFor="reportTitle">Título</Label>
            <Input
              id="reportTitle"
              value={config.reportTitle}
              onChange={(e) => updateConfig("reportTitle", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customScope">Subtítulo</Label>
            <Input
              id="customScope"
              value={config.customScope}
              onChange={(e) => updateConfig("customScope", e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* --- Seção 4: Layout --- */}
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

          <div className="space-y-2">
            <Label htmlFor="truncate">Limitar Nomes (Caracteres)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-none"
                onClick={() => handleTruncateChange(config.truncateLimit - 5)}
                disabled={config.truncateLimit <= 10}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <div className="flex-1 text-center font-mono border rounded-md h-9 flex items-center justify-center bg-muted/20 text-sm">
                {config.truncateLimit}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-none"
                onClick={() => handleTruncateChange(config.truncateLimit + 5)}
                disabled={config.truncateLimit >= 100}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Mín: 10 - Máx: 100
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
