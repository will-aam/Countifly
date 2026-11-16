"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import type { MixedSettings } from "./useMixedInventory";
import { MapPin, Volume2, Vibrate, Store, Package, Trash2, Sliders, Layers, Upload, FileSpreadsheet } from "lucide-react";

interface MixedConfigTabProps {
  settings: MixedSettings;
  onSettingsChange: (updates: Partial<MixedSettings>) => void;
  onClearCountsOnly: () => void;
  onClearAllData: () => void;
  catalogCount?: number;
  onGoToImport?: () => void;
  onClearCatalog?: () => void;
}

export function MixedConfigTab({
  settings,
  onSettingsChange,
  onClearCountsOnly,
  onClearAllData,
  catalogCount = 0,
  onGoToImport,
  onClearCatalog,
}: MixedConfigTabProps) {
  const isLevantamentoMode =
    settings.coletarQuantidade === false &&
    !settings.showLocalizacao &&
    !settings.showValidade &&
    !settings.showLote &&
    !settings.showStatusItem;

  const handleToggleLevantamento = () => {
    if (isLevantamentoMode) {
      // Reativar campos para contagem padrão
      onSettingsChange({
        coletarQuantidade: true,
        showLocalizacao: true,
        showValidade: true,
        showLote: true,
        showStatusItem: true,
      });
    } else {
      // Desativa todas as caixinhas de coleta transformando a conferência em modo levantamento
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Campos Ativos na Conferência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" /> Campos de Coleta
            </CardTitle>
            <CardDescription>
              Escolha quais campos e modos devem ser habilitados na conferência.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Botão de Atalho para Modo Levantamento */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Modo Levantamento</span>
                  {isLevantamentoMode ? (
                    <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full">
                      Desativado
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Desativa todas as caixas de coleta (quantidade, local, validade, lote e avarias) transformando a conferência na tela ágil de cadastro de catálogo (1 un/bipe).
                </p>
              </div>
              <Button
                type="button"
                variant={isLevantamentoMode ? "default" : "outline"}
                size="sm"
                onClick={handleToggleLevantamento}
                className="shrink-0 w-full sm:w-auto font-semibold shadow-sm"
              >
                {isLevantamentoMode ? "Voltar ao Modo Contagem" : "Modo Levantamento"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="switch-qtd" className="text-sm font-medium cursor-pointer">
                  Coletar Quantidade (Modo Contagem)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Desative para Modo Levantamento (registra 1 unidade automaticamente para formação de cadastro).
                </p>
              </div>
              <Switch
                id="switch-qtd"
                checked={settings.coletarQuantidade !== false}
                onCheckedChange={(val) => onSettingsChange({ coletarQuantidade: val })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="switch-loc" className="text-sm font-medium cursor-pointer">
                  Campo Localização
                </Label>
                <p className="text-xs text-muted-foreground">Exibe o campo para corredor/prateleira.</p>
              </div>
              <Switch
                id="switch-loc"
                checked={settings.showLocalizacao}
                onCheckedChange={(val) => onSettingsChange({ showLocalizacao: val })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="switch-val" className="text-sm font-medium cursor-pointer">
                  Campo Validade
                </Label>
                <p className="text-xs text-muted-foreground">Exibe o campo de data de validade do produto.</p>
              </div>
              <Switch
                id="switch-val"
                checked={settings.showValidade}
                onCheckedChange={(val) => onSettingsChange({ showValidade: val })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="switch-lote" className="text-sm font-medium cursor-pointer">
                  Campo Lote
                </Label>
                <p className="text-xs text-muted-foreground">Exibe o campo para identificação de lote.</p>
              </div>
              <Switch
                id="switch-lote"
                checked={settings.showLote}
                onCheckedChange={(val) => onSettingsChange({ showLote: val })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="switch-status" className="text-sm font-medium cursor-pointer">
                  Prevenção de Perdas (Status do Item)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Permite classificar o item como Normal, Avariado ou Vencido para segregação de perdas.
                </p>
              </div>
              <Switch
                id="switch-status"
                checked={settings.showStatusItem !== false}
                onCheckedChange={(val) => onSettingsChange({ showStatusItem: val })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Local Padrão e Ambiente de Início */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Local Padrão
            </CardTitle>
            <CardDescription>
              Escolhe qual local já começa selecionado ao abrir uma contagem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="default-location-input" className="text-xs">
                Nome do Local Padrão
              </Label>
              <Input
                id="default-location-input"
                value={settings.defaultLocation}
                onChange={(e) => onSettingsChange({ defaultLocation: e.target.value })}
                placeholder="Ex: Corredor A, Prateleira 1"
                className="h-10"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs">Ambiente de Início</Label>
              <RadioGroup
                value={settings.defaultCountingLocation}
                onValueChange={(val) =>
                  onSettingsChange({ defaultCountingLocation: val as "loja" | "estoque" })
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="loja" id="cfg-loja" />
                  <Label htmlFor="cfg-loja" className="text-xs cursor-pointer flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" /> Loja
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="estoque" id="cfg-estoque" />
                  <Label htmlFor="cfg-estoque" className="text-xs cursor-pointer flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" /> Estoque
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferências do Leitor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferências do Coletor</CardTitle>
          <CardDescription>
            Ajuste feedback sonoro e tátil ao escanear produtos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" /> Som ao Bipar
              </Label>
              <p className="text-xs text-muted-foreground">Toca um bipe a cada leitura.</p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(val) => onSettingsChange({ soundEnabled: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Vibrate className="h-4 w-4 text-muted-foreground" /> Vibração
              </Label>
              <p className="text-xs text-muted-foreground">Vibra o celular na confirmação.</p>
            </div>
            <Switch
              checked={settings.vibrationEnabled}
              onCheckedChange={(val) => onSettingsChange({ vibrationEnabled: val })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Padrões de Qualidade e Auditoria (Seção 5 do Manual) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Padrões de Qualidade e Auditoria</CardTitle>
          <CardDescription>
            Configurações de contagem cega e regras de entrada para a equipe em campo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border">
            <div className="space-y-0.5 pr-2">
              <Label className="text-sm font-medium">Contagem Cega</Label>
              <p className="text-xs text-muted-foreground">
                Oculta o saldo do sistema durante a leitura para evitar viés do conferente.
              </p>
            </div>
            <Switch
              checked={settings.blindCountMode || false}
              onCheckedChange={(val) => onSettingsChange({ blindCountMode: val })}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border">
            <div className="space-y-0.5 pr-2">
              <Label className="text-sm font-medium">Exigir Leitor / Câmera</Label>
              <p className="text-xs text-muted-foreground">
                Trava anti-digitação manual no teclado. <em>(Desativado por padrão: a digitação manual permanece livre para agilidade).</em>
              </p>
            </div>
            <Switch
              checked={settings.lockManualInput || false}
              onCheckedChange={(val) => onSettingsChange({ lockManualInput: val })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Operação com ou sem Catálogo (Híbrida) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Modo do Catálogo (Operação Híbrida)
          </CardTitle>
          <CardDescription>
            A contagem Modular funciona com planilha importada ou livremente sem catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Status Atual:</span>
                {catalogCount > 0 ? (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Catálogo Importado Ativo ({catalogCount} produtos)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Operando Sem Catálogo (Contagem Direta / Base Global)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {catalogCount > 0
                  ? "As contagens são comparadas com o saldo do ERP, calculando divergências e acurácia."
                  : "Bipagens consultam a Base Global online/offline e novos itens podem ter seu nome registrado na hora."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {catalogCount > 0 ? (
                <>
                  <Button variant="outline" size="sm" onClick={onGoToImport}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Atualizar Base
                  </Button>
                  {onClearCatalog && (
                    <Button variant="ghost" size="sm" onClick={onClearCatalog} className="text-xs text-red-600 hover:text-red-700">
                      Zerar Catálogo
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={onGoToImport}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar Catálogo CSV
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gerenciamento de Dados */}
      <Card className="border-red-200 dark:border-red-950/60 bg-red-50/20 dark:bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-base font-bold text-red-600 dark:text-red-400">
            Gerenciamento de Dados Locais
          </CardTitle>
          <CardDescription>
            Ações sobre as contagens e o catálogo armazenados no seu navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={onClearCountsOnly}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Zerar Apenas Contagens
          </Button>

          <Button
            variant="destructive"
            onClick={onClearAllData}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Limpar Catálogo e Contagens
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
