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

  // Contagem de cards ativos no resumo
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
      // Limite atingido: não permite ligar mais um card
      return;
    }
    updateConfig(key, enabled);
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
            {/* Total de SKUs */}
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
                      Quantidade de produtos distintos (códigos) exibidos no
                      relatório, após aplicar os filtros.
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

            {/* Estoque Sistema */}
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
                      Soma das quantidades que o sistema esperava (saldo
                      teórico) para todos os SKUs do relatório.
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

            {/* Contagem Física */}
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
                      Soma das quantidades físicas contadas (Loja + Estoque)
                      para todos os SKUs do relatório.
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

            {/* Divergência */}
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
                onCheckedChange={(c) =>
                  handleToggleCard("showCardDivergence", c)
                }
              />
            </div>

            {/* Acuracidade */}
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
                      Percentual de SKUs sem divergência (diferença zero) em
                      relação ao total de SKUs exibidos no relatório.
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

            {/* Itens Certos */}
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

            {/* Itens com Falta */}
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

            {/* Itens com Sobra */}
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
