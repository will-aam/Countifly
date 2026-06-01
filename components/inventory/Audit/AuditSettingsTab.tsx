"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Zap } from "lucide-react";

export interface AuditConfig {
  offlineMode: boolean;
  collectPrice: boolean;
  directScan: boolean; // <-- NOVO: Controle de Bipagem Direta
}

interface AuditSettingsTabProps {
  config: AuditConfig;
  setConfig: (config: AuditConfig) => void;
  userId: number | null;
}

export function AuditSettingsTab({
  config,
  setConfig,
  userId,
}: AuditSettingsTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Base de Dados Global */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Base de Dados Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="offline-mode"
              checked={config.offlineMode}
              onCheckedChange={() =>
                setConfig({ ...config, offlineMode: !config.offlineMode })
              }
            />
            <Label htmlFor="offline-mode">Ativar Base Offline</Label>
          </div>
          <CardDescription>Baixa produtos para o navegador.</CardDescription>
          {config.offlineMode && (
            <div className="mt-2">
              <Badge variant="secondary" className="gap-1">
                <WifiOff className="h-3 w-3" /> Pronto para uso sem internet
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Auditoria de Valor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Auditoria de Valor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="collect-price"
              checked={config.collectPrice}
              onCheckedChange={() =>
                setConfig({ ...config, collectPrice: !config.collectPrice })
              }
            />
            <Label htmlFor="collect-price">Solicitar Preço</Label>
          </div>
          <CardDescription>
            Ao bipar um item, o sistema pedirá o preço unitário (R$) além da
            quantidade.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Card 3: Bipagem Direta (+1) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Bipagem Direta (+1)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="direct-scan"
              checked={config.directScan}
              onCheckedChange={() =>
                setConfig({ ...config, directScan: !config.directScan })
              }
            />
            <Label htmlFor="direct-scan">Somar automaticamente</Label>
          </div>
          <CardDescription>
            Adiciona +1 na contagem a cada leitura do código, sem exibir a tela
            para digitar a quantidade.
          </CardDescription>
          {config.directScan && (
            <div className="mt-2">
              <Badge
                variant="default"
                className="gap-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 shadow-none border-none"
              >
                <Zap className="h-3 w-3" /> Agilidade ativada
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
