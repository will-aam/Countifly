"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { playScannerFeedbackTone } from "@/lib/scanner-feedback";
import type { ImportSettings } from "@/hooks/inventory/useImportSettings";
import { MapPin, ScanLine, Volume2, Vibrate, Zap } from "lucide-react";

interface ConfigTabProps {
  settings: ImportSettings;
  onSettingsChange: (updates: Partial<ImportSettings>) => void;
}

export function ConfigTab({ settings, onSettingsChange }: ConfigTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" /> Local padrão
          </CardTitle>
          <CardDescription>
            Escolhe qual local já começa selecionado ao abrir uma contagem nova.
            Você ainda pode trocar entre Loja e Estoque durante a conferência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.defaultCountingLocation}
            onValueChange={(value) =>
              onSettingsChange({
                defaultCountingLocation: value as ImportSettings["defaultCountingLocation"],
              })
            }
            className="grid gap-3 sm:grid-cols-2"
          >
            <Label
              htmlFor="default-location-loja"
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-4"
            >
              <RadioGroupItem id="default-location-loja" value="loja" />
              <span>Loja</span>
            </Label>
            <Label
              htmlFor="default-location-estoque"
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-4"
            >
              <RadioGroupItem id="default-location-estoque" value="estoque" />
              <span>Estoque</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" /> Feedback da bipagem
          </CardTitle>
          <CardDescription>
            Ajuste os sinais emitidos quando um código é reconhecido ou não
            encontrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="scanner-sound" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" /> Som
            </Label>
            <Switch
              id="scanner-sound"
              checked={settings.soundEnabled}
              onCheckedChange={(soundEnabled) =>
                onSettingsChange({ soundEnabled })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label
              htmlFor="scanner-vibration"
              className="flex items-center gap-2"
            >
              <Vibrate className="h-4 w-4 text-muted-foreground" /> Vibração
            </Label>
            <Switch
              id="scanner-vibration"
              checked={settings.vibrationEnabled}
              onCheckedChange={(vibrationEnabled) =>
                onSettingsChange({ vibrationEnabled })
              }
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!settings.soundEnabled}
            onClick={() => playScannerFeedbackTone("success")}
          >
            Testar som
          </Button>
          <p className="text-xs text-muted-foreground">
            A disponibilidade de som e vibração depende do navegador e do dispositivo.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" /> Bipagem rápida (+1)
          </CardTitle>
          <CardDescription>
            Cada leitura feita pelo scanner adiciona uma unidade ao local
            selecionado, inclusive para itens não encontrados. Não pede
            quantidade e volta a aguardar o próximo código.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="direct-scan">Somar uma unidade por leitura</Label>
            <Switch
              id="direct-scan"
              checked={settings.directScanEnabled}
              onCheckedChange={(directScanEnabled) =>
                onSettingsChange({ directScanEnabled })
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Desativada por padrão. Quando ativada, cada bipagem adiciona +1,
            inclusive para itens não encontrados no catálogo.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground lg:col-span-2">
        As preferências são salvas automaticamente neste navegador para esta
        conta.
      </p>
    </div>
  );
}
