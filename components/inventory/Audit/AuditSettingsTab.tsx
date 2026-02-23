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
import { WifiOff } from "lucide-react";

export interface AuditConfig {
  offlineMode: boolean;
  collectPrice: boolean;
  // A propriedade companyId foi removida daqui, pois agora é gerenciada globalmente!
}

interface AuditSettingsTabProps {
  config: AuditConfig;
  setConfig: (config: AuditConfig) => void;
  userId: number | null;
}

export function AuditSettingsTab({
  config,
  setConfig,
  userId, // Mantido caso precise futuramente, mas atualmente sem uso neste arquivo limpo
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
    </div>
  );
}
