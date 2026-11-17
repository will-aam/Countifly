"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { MixedSettings } from "./useMixedInventory";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Volume2,
  Vibrate,
  Store,
  Package,
  Trash2,
  Sliders,
  Layers,
  Upload,
  ShieldCheck,
  ScanLine,
  Info,
} from "lucide-react";

interface MixedConfigTabProps {
  settings: MixedSettings;
  onSettingsChange: (updates: Partial<MixedSettings>) => void;
  onClearCountsOnly: () => void;
  onClearAllData: () => void;
  catalogCount?: number;
  onGoToImport?: () => void;
  onClearCatalog?: () => void;
  barcodeLength?: number;
  onBarcodeLengthChange?: (len: number) => void;
}

/**
 * Ícone 'i' discreto usado apenas onde há regra ou comportamento não-óbvio.
 */
function InfoHelp({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Mais informações"
          className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/70 transition-colors focus:outline-none"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 p-2.5 text-xs text-muted-foreground leading-relaxed shadow-md border-border/80"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}

export function MixedConfigTab({
  settings,
  onSettingsChange,
  onClearCountsOnly,
  onClearAllData,
  catalogCount = 0,
  onGoToImport,
  onClearCatalog,
  barcodeLength = 13,
  onBarcodeLengthChange,
}: MixedConfigTabProps) {
  const isLevantamentoMode =
    settings.coletarQuantidade === false &&
    !settings.showLocalizacao &&
    !settings.showValidade &&
    !settings.showLote &&
    !settings.showStatusItem;

  const handleToggleLevantamento = () => {
    if (isLevantamentoMode) {
      onSettingsChange({
        coletarQuantidade: true,
        showLocalizacao: true,
        showValidade: true,
        showLote: true,
        showStatusItem: true,
      });
    } else {
      onSettingsChange({
        coletarQuantidade: false,
        showLocalizacao: false,
        showValidade: false,
        showLote: false,
        showStatusItem: false,
      });
    }
  };

  return (
    <div className="w-full space-y-5 pb-24 sm:pb-12 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* === COLUNA 1: COLETA & SCANNER === */}
        <div className="space-y-5">
          {/* 1. CAMPOS DE COLETA NA CONFERÊNCIA */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                  Campos de Coleta
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              {/* Modo Levantamento Minimalista */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-muted/20">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="switch-levantamento" className="text-xs sm:text-sm font-semibold cursor-pointer text-foreground">
                    Modo Levantamento (1 un/bipe)
                  </Label>
                  <InfoHelp text="Desativa os campos adicionais para formação rápida de catálogo bipando 1 unidade por produto." />
                  {isLevantamentoMode && (
                    <Badge variant="default" className="text-[10px] h-4 px-1.5 font-medium ml-1">
                      Ativo
                    </Badge>
                  )}
                </div>
                <Switch
                  id="switch-levantamento"
                  checked={isLevantamentoMode}
                  onCheckedChange={handleToggleLevantamento}
                />
              </div>

              {/* Lista de Atributos Individuais */}
              <div className="divide-y divide-border/50 text-xs sm:text-sm">
                {/* Coletar Quantidade */}
                <div className="flex items-center justify-between py-2.5">
                  <Label htmlFor="switch-qtd" className="font-medium cursor-pointer text-foreground">
                    Coletar Quantidade
                  </Label>
                  <Switch
                    id="switch-qtd"
                    checked={settings.coletarQuantidade !== false}
                    onCheckedChange={(val) => onSettingsChange({ coletarQuantidade: val })}
                  />
                </div>

                {/* Localização */}
                <div className="flex items-center justify-between py-2.5">
                  <Label htmlFor="switch-loc" className="font-medium cursor-pointer text-foreground">
                    Localização
                  </Label>
                  <Switch
                    id="switch-loc"
                    checked={settings.showLocalizacao}
                    onCheckedChange={(val) => onSettingsChange({ showLocalizacao: val })}
                  />
                </div>

                {/* Validade */}
                <div className="flex items-center justify-between py-2.5">
                  <Label htmlFor="switch-val" className="font-medium cursor-pointer text-foreground">
                    Data de Validade
                  </Label>
                  <Switch
                    id="switch-val"
                    checked={settings.showValidade}
                    onCheckedChange={(val) => onSettingsChange({ showValidade: val })}
                  />
                </div>

                {/* Lote */}
                <div className="flex items-center justify-between py-2.5">
                  <Label htmlFor="switch-lote" className="font-medium cursor-pointer text-foreground">
                    Lote
                  </Label>
                  <Switch
                    id="switch-lote"
                    checked={settings.showLote}
                    onCheckedChange={(val) => onSettingsChange({ showLote: val })}
                  />
                </div>

                {/* Prevenção de Perdas */}
                <div className="flex items-center justify-between py-2.5">
                  <Label htmlFor="switch-status" className="font-medium cursor-pointer text-foreground">
                    Prevenção de Perdas (Avarias/Vencidos)
                  </Label>
                  <Switch
                    id="switch-status"
                    checked={settings.showStatusItem !== false}
                    onCheckedChange={(val) => onSettingsChange({ showStatusItem: val })}
                  />
                </div>

                {/* Permitir Editar Descrição */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="switch-allow-desc" className="font-medium cursor-pointer text-foreground">
                      Permitir Editar Descrição
                    </Label>
                    <InfoHelp text="Habilita caixa para alterar o nome do produto ao bipar (desativado por padrão para manter a integridade do cadastro)." />
                  </div>
                  <Switch
                    id="switch-allow-desc"
                    checked={settings.allowEditDescription === true}
                    onCheckedChange={(val) => onSettingsChange({ allowEditDescription: val })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. TAMANHO DO CÓDIGO DO SCANNER */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2.5 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                  Tamanho do Código do Scanner
                </CardTitle>
              </div>
              <InfoHelp text="Para leitores físicos, define o tamanho exato que inicia a busca automática (padrão: 13 caracteres, temporário por contagem). Códigos de outro tamanho ainda podem ser lidos pressionando Enter." />
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="scanner-barcode-length" className="text-xs sm:text-sm font-medium text-foreground">
                  Caracteres por código:
                </Label>
                <Input
                  id="scanner-barcode-length"
                  type="number"
                  min={1}
                  max={64}
                  step={1}
                  value={barcodeLength}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 1 && value <= 64) {
                      onBarcodeLengthChange?.(value);
                    }
                  }}
                  className="w-20 h-8 text-xs font-mono text-center"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. FEEDBACK DO COLETOR */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2.5">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                  Feedback do Coletor
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card">
                  <span className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Som
                  </span>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(val) => onSettingsChange({ soundEnabled: val })}
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card">
                  <span className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <Vibrate className="h-3.5 w-3.5 text-muted-foreground" />
                    Vibração
                  </span>
                  <Switch
                    checked={settings.vibrationEnabled}
                    onCheckedChange={(val) => onSettingsChange({ vibrationEnabled: val })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === COLUNA 2: CATÁLOGO, LOCAL & QUALIDADE === */}
        <div className="space-y-5">
          {/* 4. BASE DE DADOS / CATÁLOGO */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                  Base de Dados / Catálogo
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">Status da Base:</span>
                {catalogCount > 0 ? (
                  <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-semibold">
                    Catálogo Importado ({catalogCount.toLocaleString("pt-BR")})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold">
                    Modo Livre (Sem Catálogo)
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                {catalogCount > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onGoToImport}
                      className="flex-1 text-xs font-semibold h-8"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> Atualizar Base
                    </Button>
                    {onClearCatalog && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearCatalog}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2.5"
                      >
                        Zerar Catálogo
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGoToImport}
                    className="w-full text-xs font-semibold h-8"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar Catálogo CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5. LOCAL PADRÃO E AMBIENTE */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                  Local Padrão e Ambiente
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="default-location-input" className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                  Local Inicial:
                </Label>
                <Input
                  id="default-location-input"
                  value={settings.defaultLocation}
                  onChange={(e) => onSettingsChange({ defaultLocation: e.target.value })}
                  placeholder="Ex: Geral, Corredor 1"
                  className="h-8 text-xs sm:text-sm max-w-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-xs sm:text-sm font-medium text-foreground">Ambiente Inicial:</span>
                <RadioGroup
                  value={settings.defaultCountingLocation}
                  onValueChange={(val) =>
                    onSettingsChange({ defaultCountingLocation: val as "loja" | "estoque" })
                  }
                  className="flex items-center gap-2"
                >
                  <Label
                    htmlFor="cfg-loja"
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                      settings.defaultCountingLocation === "loja"
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                        : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <RadioGroupItem value="loja" id="cfg-loja" className="sr-only" />
                    <Store className="h-3 w-3" />
                    <span>Loja</span>
                  </Label>
                  <Label
                    htmlFor="cfg-estoque"
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                      settings.defaultCountingLocation === "estoque"
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                        : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <RadioGroupItem value="estoque" id="cfg-estoque" className="sr-only" />
                    <Package className="h-3 w-3" />
                    <span>Estoque</span>
                  </Label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* 6. QUALIDADE E AUDITORIA */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                  Qualidade e Auditoria
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-1 divide-y divide-border/50 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="switch-blind" className="font-medium cursor-pointer text-foreground">
                    Contagem Cega
                  </Label>
                  <InfoHelp text="Oculta o saldo previsto do sistema na tela do operador para evitar vícios de contagem." />
                </div>
                <Switch
                  id="switch-blind"
                  checked={settings.blindCountMode || false}
                  onCheckedChange={(val) => onSettingsChange({ blindCountMode: val })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="switch-lock-manual" className="font-medium cursor-pointer text-foreground">
                    Exigir Leitor / Câmera
                  </Label>
                  <InfoHelp text="Bloqueia a digitação manual de código de barras para obrigar leitura física com leitor ou câmera." />
                </div>
                <Switch
                  id="switch-lock-manual"
                  checked={settings.lockManualInput || false}
                  onCheckedChange={(val) => onSettingsChange({ lockManualInput: val })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 7. GERENCIAMENTO DE DADOS LOCAIS */}
          <Card className="border-red-200 dark:border-red-950/60 bg-red-50/15 dark:bg-red-950/10 shadow-xs">
            <CardHeader className="p-4 pb-2.5">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
                <CardTitle className="text-sm sm:text-base font-semibold">
                  Dados Locais
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40 text-xs h-8 font-semibold"
                  onClick={onClearCountsOnly}
                >
                  Zerar Contagens
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 text-xs h-8 font-semibold"
                  onClick={onClearAllData}
                >
                  Limpar Tudo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
