import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch"; // Usando Switch para consistência visual
import { Settings, Printer, Minus, Plus, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { DatabaseReportConfig } from "./types";

interface DatabaseReportConfigPanelProps {
  config: DatabaseReportConfig;
  setConfig: (config: DatabaseReportConfig) => void;
}

export const DatabaseReportConfigPanel: React.FC<
  DatabaseReportConfigPanelProps
> = ({ config, setConfig }) => {
  const updateConfig = (key: keyof DatabaseReportConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleTruncateChange = (newValue: number) => {
    if (newValue >= 10 && newValue <= 100) {
      updateConfig("truncateLimit", newValue);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* --- Grupo 1: Geral --- */}
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

        {/* --- Seção: Logo no relatório --- */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            Logo no Relatório
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center"
                >
                  <Info className="w-5 h-5 text-blue-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-xs text-xs">
                  Na prática, a logo sempre vai caber em um retângulo de ~64px
                  de altura × 120px de largura. Qualquer PNG quadrado (500×500,
                  600×600, 1024×1024) será reduzido e encaixado sem distorção.
                </p>
              </TooltipContent>
            </Tooltip>
          </h3>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wider">
                Exibir logo
              </span>
              <span className="text-[11px] text-muted-foreground">
                Mostra uma logo fixa no cabeçalho do relatório.
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
                      alt="Logo"
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

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showLogo: false,
                    })
                  }
                >
                  Remover logo
                </Button>

                {/* Upload de logo PNG */}
                <label className="inline-flex items-center">
                  <span className="sr-only">Enviar logo</span>
                  <input
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.type !== "image/png") {
                        return;
                      }

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

        {/* --- Grupo 3: Layout e Impressão --- */}
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

          {/* Truncate Control */}
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
