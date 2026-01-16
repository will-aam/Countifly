// components/inventory/report-builder/ReportConfigPanel.tsx

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
  // --- NOVA PROP ---
  hasTempItems: boolean;
  // -----------------
}

export const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  config,
  setConfig,
  hasTempItems, // Recebendo a prop
}) => {
  const updateConfig = (key: keyof ReportConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  // ... (código dos contadores de cards mantido igual) ...
  const activeCardsCount =
    (config.showCardSku ? 1 : 0) +
    (config.showCardSystem ? 1 : 0) +
    (config.showCardCounted ? 1 : 0) +
    (config.showCardDivergence ? 1 : 0) +
    (config.showCardAccuracy ? 1 : 0) +
    (config.showCardItemsCorrect ? 1 : 0) +
    (config.showCardItemsMissing ? 1 : 0) +
    (config.showCardItemsSurplus ? 1 : 0);

  const MAX_CARDS = 6;

  const handleToggleCard = (key: keyof ReportConfig, enabled: boolean) => {
    if (enabled && activeCardsCount >= MAX_CARDS) {
      return;
    }
    updateConfig(key, enabled);
  };

  const handleTruncateChange = (newValue: number) => {
    if (newValue >= 10 && newValue <= 100) {
      updateConfig("truncateLimit", newValue);
    }
  };

  return (
    <TooltipProvider>
      <div className="bg-background p-4 space-y-6">
        {/* ... (Seção 1 Resumo mantida igual) ... */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground tracking-wider flex items-center gap-2">
            Resumo (Cards)
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center"
                >
                  {activeCardsCount >= MAX_CARDS && (
                    <span className="inline-flex items-center gap-1 text-[11px]">
                      <Info className="w-5 h-5 text-blue-500" />
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-xs text-xs">
                  Máximo de 6 cards. Desative um para ativar outro.
                </p>
              </TooltipContent>
            </Tooltip>
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {/* ... (Cards existentes mantidos: SKUs, Sistema, Contado, etc) ... */}
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
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Quantidade de produtos distintos...
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardSku"
                checked={config.showCardSku}
                onCheckedChange={(c) => handleToggleCard("showCardSku", c)}
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
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Soma das quantidades que o sistema esperava...
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardSystem"
                checked={config.showCardSystem}
                onCheckedChange={(c) => handleToggleCard("showCardSystem", c)}
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
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Soma das quantidades físicas contadas...
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardCounted"
                checked={config.showCardCounted}
                onCheckedChange={(c) => handleToggleCard("showCardCounted", c)}
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
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Saldo geral de divergência em unidades...
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardDivergence"
                checked={config.showCardDivergence}
                onCheckedChange={(c) =>
                  handleToggleCard("showCardDivergence", c)
                }
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
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs text-xs">
                      Percentual de SKUs sem divergência...
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="cardAccuracy"
                checked={config.showCardAccuracy}
                onCheckedChange={(c) => handleToggleCard("showCardAccuracy", c)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cardItemsCorrect" className="cursor-pointer">
                Itens Certos
              </Label>
              <Switch
                id="cardItemsCorrect"
                checked={config.showCardItemsCorrect}
                onCheckedChange={(c) =>
                  handleToggleCard("showCardItemsCorrect", c)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cardItemsMissing" className="cursor-pointer">
                Itens com Falta
              </Label>
              <Switch
                id="cardItemsMissing"
                checked={config.showCardItemsMissing}
                onCheckedChange={(c) =>
                  handleToggleCard("showCardItemsMissing", c)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cardItemsSurplus" className="cursor-pointer">
                Itens com Sobra
              </Label>
              <Switch
                id="cardItemsSurplus"
                checked={config.showCardItemsSurplus}
                onCheckedChange={(c) =>
                  handleToggleCard("showCardItemsSurplus", c)
                }
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

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="showInternalCode">Exibir código interno</Label>
            <Switch
              id="showInternalCode"
              checked={config.showInternalCode}
              onCheckedChange={(c) => updateConfig("showInternalCode", c)}
            />
          </div>

          {/* --- LÓGICA INTELIGENTE DO BOTÃO TEMP --- */}
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="hideTempItems"
              className={
                hasTempItems ? "text-sm font-medium" : "text-muted-foreground"
              }
            >
              {hasTempItems
                ? "Ocultar Novos Itens (TEMP)"
                : 'Nenhum "item novo" detectado'}
            </Label>
            <Switch
              id="hideTempItems"
              checked={config.hideTempItems}
              onCheckedChange={(c) => updateConfig("hideTempItems", c)}
              disabled={!hasTempItems} // Fica cinza e inclicável se não tiver itens temp
            />
          </div>
          {/* -------------------------------------- */}

          <div className="space-y-3">
            {/* ... (Switches showCorrect, showSurplus, etc. mantidos) ... */}
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="sortByBiggestError">
                Ordenar por maior diferença
              </Label>
              <Switch
                id="sortByBiggestError"
                checked={config.sortByBiggestError}
                onCheckedChange={(c) => updateConfig("sortByBiggestError", c)}
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
                Adiciona um espaço em branco na tabela para checagem manual...
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ... (Seções 3 e 4 mantidas iguais) ... */}
        {/* Apenas copiando para manter o arquivo completo e evitar erros de fechamento */}
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
            <p className="text-[10px] text-muted-foreground">
              Máximo de 35 caracteres.
            </p>
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
            <p className="text-[10px] text-muted-foreground">
              Máximo de 35 caracteres.
            </p>
          </div>
        </div>

        <Separator />

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
