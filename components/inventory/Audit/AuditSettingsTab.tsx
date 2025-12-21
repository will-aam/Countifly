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
import { WifiOff, DollarSign, Database, FileSignature } from "lucide-react";

// Adicionamos 'enableCustomName' na interface
export interface AuditConfig {
  offlineMode: boolean;
  collectPrice: boolean;
  enableCustomName: boolean; // <--- NOVO
}

interface AuditSettingsTabProps {
  config: AuditConfig;
  setConfig: (config: AuditConfig) => void;
}

export function AuditSettingsTab({ config, setConfig }: AuditSettingsTabProps) {
  const toggleConfig = (key: keyof AuditConfig) => {
    setConfig({ ...config, [key]: !config[key] });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Modo Offline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Base de Dados Global
          </CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="offline-mode"
              checked={config.offlineMode}
              onCheckedChange={() => toggleConfig("offlineMode")}
            />
            <Label htmlFor="offline-mode">Ativar Base Offline</Label>
          </div>
          <CardDescription>
            Baixa produtos para o navegador. Permite reconhecer itens sem
            importar CSV.
          </CardDescription>
          {config.offlineMode && (
            <div className="mt-2">
              <Badge variant="secondary" className="gap-1">
                <WifiOff className="h-3 w-3" /> Pronto para uso sem internet
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Coleta de Preço */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Auditoria de Valor
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="collect-price"
              checked={config.collectPrice}
              onCheckedChange={() => toggleConfig("collectPrice")}
            />
            <Label htmlFor="collect-price">Solicitar Preço</Label>
          </div>
          <CardDescription>
            Ao bipar um item, o sistema pedirá o preço unitário (R$) além da
            quantidade.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Card 3: Nome do Arquivo (NOVO) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nome do Arquivo</CardTitle>
          <FileSignature className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="custom-name"
              checked={config.enableCustomName}
              onCheckedChange={() => toggleConfig("enableCustomName")}
            />
            <Label htmlFor="custom-name">Definir Nome Personalizado</Label>
          </div>
          <CardDescription>
            Habilita um campo na tela de conferência para nomear o arquivo de
            saída.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
