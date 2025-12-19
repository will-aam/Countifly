// components/inventory/report-builder/ReportConfigPanel.tsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { ReportConfig } from "./types";

interface ReportConfigPanelProps {
  config: ReportConfig;
  setConfig: (config: ReportConfig) => void;
  onPrint: () => void;
}

export const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  config,
  setConfig,
  onPrint,
}) => {
  const updateConfig = (key: keyof ReportConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleTruncateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 10) {
      updateConfig("truncateLimit", val);
    } else if (isNaN(val)) {
    }
  };

  return (
    <div className="bg-background border rounded-lg p-4 space-y-6 shadow-sm h-full overflow-y-auto">
      <div className="flex items-center justify-between lg:hidden mb-4">
        <h2 className="font-semibold text-lg">Configurações</h2>
      </div>

      {/* --- Seção 1: Resumo Executivo (KPIs) --- */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Resumo (Cards)
        </h3>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="cardSku" className="cursor-pointer">
              Total de SKUs
            </Label>
            <Switch
              id="cardSku"
              checked={config.showCardSku}
              onCheckedChange={(c) => updateConfig("showCardSku", c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="cardSystem" className="cursor-pointer">
              Estoque Sistema
            </Label>
            <Switch
              id="cardSystem"
              checked={config.showCardSystem}
              onCheckedChange={(c) => updateConfig("showCardSystem", c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="cardCounted" className="cursor-pointer">
              Contagem Física
            </Label>
            <Switch
              id="cardCounted"
              checked={config.showCardCounted}
              onCheckedChange={(c) => updateConfig("showCardCounted", c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="cardDivergence" className="cursor-pointer">
              Divergência
            </Label>
            <Switch
              id="cardDivergence"
              checked={config.showCardDivergence}
              onCheckedChange={(c) => updateConfig("showCardDivergence", c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label
              htmlFor="cardAccuracy"
              className="cursor-pointer font-semibold text-blue-600"
            >
              Acuracidade (%)
            </Label>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="showCorrect">Itens Corretos</Label>
            <Switch
              id="showCorrect"
              checked={config.showCorrect}
              onCheckedChange={(c) => updateConfig("showCorrect", c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showSurplus">Sobras (+)</Label>
            <Switch
              id="showSurplus"
              checked={config.showSurplus}
              onCheckedChange={(c) => updateConfig("showSurplus", c)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showMissing">Faltas (-)</Label>
            <Switch
              id="showMissing"
              checked={config.showMissing}
              onCheckedChange={(c) => updateConfig("showMissing", c)}
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
              Adiciona um espaço para checagem manual no papel.
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
          <Label htmlFor="truncate">Limitar Nomes (Min: 10)</Label>
          <Input
            id="truncate"
            type="number"
            min="10"
            max="100"
            value={config.truncateLimit}
            onChange={handleTruncateChange}
          />
        </div>
      </div>

      <div className="pt-4 sticky bottom-0 bg-background pb-2 z-10">
        <Button onClick={onPrint} className="w-full" size="lg">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Relatório
        </Button>
      </div>
    </div>
  );
};
